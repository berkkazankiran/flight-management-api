import os
import json
import csv
import math
from functools import lru_cache

import requests

from app.database import get_connection
from confluent_kafka import Producer


OPENSKY_TOKEN_URL = (
    "https://auth.opensky-network.org/auth/realms/"
    "opensky-network/protocol/openid-connect/token"
)

OPENSKY_STATES_URL = "https://opensky-network.org/api/states/all"


def get_access_token():
    response = requests.post(
        OPENSKY_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": os.getenv("OPENSKY_CLIENT_ID"),
            "client_secret": os.getenv("OPENSKY_CLIENT_SECRET"),
        },
        timeout=20,
    )

    response.raise_for_status()

    return response.json()["access_token"]

def get_opensky_flight_route(icao24):
    try:
        token = get_access_token()

        import time

        now = int(time.time())

        response = requests.get(
            "https://opensky-network.org/api/flights/aircraft",
            params={
                "icao24": icao24,
                "begin": now - 86400,
                "end": now,
            },
            headers={
                "Authorization": f"Bearer {token}"
            },
            timeout=30,
        )

        response.raise_for_status()

        flights = response.json()

        if not flights:
            return None

       
        flight = flights[-1]

        return {
            "departure_icao":
                flight.get("estDepartureAirport"),

            "arrival_icao":
                flight.get("estArrivalAirport"),

            "callsign":
                (
                    flight.get("callsign").strip()
                    if flight.get("callsign")
                    else None
                ),
        }

    except Exception as error:
        print(
            "OpenSky flight route error:",
            repr(error),
            flush=True,
        )

        return None


def convert_state(state):
    return {
        "icao24": state[0],
        "callsign": state[1].strip() if state[1] else None,
        "origin_country": state[2],
        "time_position": state[3],
        "last_contact": state[4],
        "longitude": state[5],
        "latitude": state[6],
        "barometric_altitude_m": state[7],
        "on_ground": state[8],
        "velocity_m_s": state[9],
        "heading_deg": state[10],
        "vertical_rate_m_s": state[11],
        "geometric_altitude_m": state[13],
        "squawk": state[14],
        "position_source": state[16],
    }


def fetch_live_flights(bounds=None):
    token = get_access_token()

    request_params = None

    if bounds is not None:
        request_params = {
            "lamin": bounds["lamin"],
            "lomin": bounds["lomin"],
            "lamax": bounds["lamax"],
            "lomax": bounds["lomax"],
        }

    response = requests.get(
        OPENSKY_STATES_URL,
        headers={
            "Authorization": f"Bearer {token}"
        },
        params=request_params,
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()
    states = data.get("states") or []

    flights = []

    for state in states:
        if state[5] is not None and state[6] is not None:
            flights.append(convert_state(state))

    return {
        "time": data.get("time"),
        "flights": flights,
    }

KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "kafka:9092"
)

KAFKA_TOPIC = os.getenv(
    "KAFKA_TOPIC",
    "live-flights"
)

kafka_producer = Producer({
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "client.id": "flight-api-producer",
})

def publish_flights_to_kafka(flights):
    for flight in flights:
        kafka_producer.produce(
            topic=KAFKA_TOPIC,
            key=flight["icao24"],
            value=json.dumps(flight).encode("utf-8"),
        )

        kafka_producer.poll(0)

    remaining_messages = kafka_producer.flush(10)

    if remaining_messages != 0:
        raise RuntimeError(
            f"{remaining_messages} Kafka mesajı gönderilemedi."
        )


def save_live_flights(flights):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        for flight in flights:
            cursor.execute("""
                INSERT INTO live_flights (
                    icao24,
                    callsign,
                    country,
                    longitude,
                    latitude,
                    altitude,
                    velocity,
                    heading,
                    on_ground,
                    last_update
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)

                ON CONFLICT (icao24)
                DO UPDATE SET
                    callsign = EXCLUDED.callsign,
                    country = EXCLUDED.country,
                    longitude = EXCLUDED.longitude,
                    latitude = EXCLUDED.latitude,
                    altitude = EXCLUDED.altitude,
                    velocity = EXCLUDED.velocity,
                    heading = EXCLUDED.heading,
                    on_ground = EXCLUDED.on_ground,
                    last_update = EXCLUDED.last_update;
            """, (
                flight["icao24"],
                flight["callsign"],
                flight["origin_country"],
                flight["longitude"],
                flight["latitude"],
                flight["barometric_altitude_m"],
                flight["velocity_m_s"],
                flight["heading_deg"],
                flight["on_ground"],
                flight["last_contact"],
            ))

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


def get_saved_live_flights():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT
                icao24,
                callsign,
                country,
                longitude,
                latitude,
                altitude,
                velocity,
                heading,
                on_ground,
                last_update
            FROM live_flights
            ORDER BY callsign NULLS LAST;
        """)

        rows = cursor.fetchall()

        return [
            {
                "icao24": row[0],
                "callsign": row[1],
                "origin_country": row[2],
                "longitude": row[3],
                "latitude": row[4],
                "barometric_altitude_m": row[5],
                "velocity_m_s": row[6],
                "heading_deg": row[7],
                "on_ground": row[8],
                "last_contact": row[9],
            }
            for row in rows
        ]

    finally:
        cursor.close()
        connection.close()

EARTH_RADIUS_KM = 6371.0


def calculate_distance_km(
    latitude_1,
    longitude_1,
    latitude_2,
    longitude_2,
):
    lat1 = math.radians(float(latitude_1))
    lon1 = math.radians(float(longitude_1))
    lat2 = math.radians(float(latitude_2))
    lon2 = math.radians(float(longitude_2))

    latitude_difference = lat2 - lat1
    longitude_difference = lon2 - lon1

    haversine_value = (
        math.sin(latitude_difference / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(longitude_difference / 2) ** 2
    )

    angular_distance = 2 * math.atan2(
        math.sqrt(haversine_value),
        math.sqrt(1 - haversine_value),
    )

    return EARTH_RADIUS_KM * angular_distance


@lru_cache(maxsize=1)
def load_airports():
    current_directory = os.path.dirname(
        os.path.abspath(__file__)
    )

    airport_file_path = os.path.join(
        current_directory,
        "data",
        "airport.csv",
    )

    airports = []

    with open(
        airport_file_path,
        mode="r",
        encoding="utf-8",
        newline="",
    ) as airport_file:
        reader = csv.DictReader(airport_file)

        for row in reader:
            airport_type = row.get("type", "").strip()

            if airport_type not in {
                "large_airport",
                "medium_airport",
            }:
                continue

            latitude = row.get("latitude_deg")
            longitude = row.get("longitude_deg")

            if not latitude or not longitude:
                continue

            try:
                latitude = float(latitude)
                longitude = float(longitude)
            except (TypeError, ValueError):
                continue

            airports.append(
                {
                    "icao_code": (
                        row.get("icao_code")
                        or row.get("ident")
                        or ""
                    ).strip(),
                    "iata_code": (
                        row.get("iata_code") or ""
                    ).strip(),
                    "name": (
                        row.get("name") or ""
                    ).strip(),
                    "city": (
                        row.get("municipality") or ""
                    ).strip(),
                    "country_code": (
                        row.get("iso_country") or ""
                    ).strip(),
                    "latitude": latitude,
                    "longitude": longitude,
                    "type": airport_type,
                }
            )

    print(
        f"Toplam {len(airports)} havalimanı yüklendi.",
        flush=True,
    )

    return airports

def find_airport_by_icao(icao_code):
    if not icao_code:
        return None

    icao_code = icao_code.strip().upper()

    for airport in load_airports():
        if airport["icao_code"].upper() == icao_code:
            return {
                "icao_code": airport["icao_code"],
                "iata_code": airport["iata_code"],
                "name": airport["name"],
                "city": airport["city"],
                "country_code": airport["country_code"],
                "latitude": airport["latitude"],
                "longitude": airport["longitude"],
                "distance_km": None,
            }

    return None

def calculate_destination_point(
    latitude,
    longitude,
    heading_deg,
    distance_km,
):
    latitude_rad = math.radians(float(latitude))
    longitude_rad = math.radians(float(longitude))
    heading_rad = math.radians(float(heading_deg))

    angular_distance = (
        float(distance_km) / EARTH_RADIUS_KM
    )

    destination_latitude_rad = math.asin(
        math.sin(latitude_rad)
        * math.cos(angular_distance)
        + math.cos(latitude_rad)
        * math.sin(angular_distance)
        * math.cos(heading_rad)
    )

    destination_longitude_rad = (
        longitude_rad
        + math.atan2(
            math.sin(heading_rad)
            * math.sin(angular_distance)
            * math.cos(latitude_rad),
            math.cos(angular_distance)
            - math.sin(latitude_rad)
            * math.sin(destination_latitude_rad),
        )
    )

    return (
        math.degrees(destination_latitude_rad),
        math.degrees(destination_longitude_rad),
    )

def calculate_great_circle_route(
    start_latitude,
    start_longitude,
    end_latitude,
    end_longitude,
    point_count=50,
):
    start_latitude = math.radians(
        float(start_latitude)
    )
    start_longitude = math.radians(
        float(start_longitude)
    )
    end_latitude = math.radians(
        float(end_latitude)
    )
    end_longitude = math.radians(
        float(end_longitude)
    )

    angular_distance = (
        calculate_distance_km(
            math.degrees(start_latitude),
            math.degrees(start_longitude),
            math.degrees(end_latitude),
            math.degrees(end_longitude),
        )
        / EARTH_RADIUS_KM
    )

    if angular_distance == 0:
        return [[
            math.degrees(start_latitude),
            math.degrees(start_longitude),
        ]]

    route_points = []

    for index in range(point_count + 1):
        fraction = index / point_count

        coefficient_a = (
            math.sin(
                (1 - fraction) * angular_distance
            )
            / math.sin(angular_distance)
        )

        coefficient_b = (
            math.sin(
                fraction * angular_distance
            )
            / math.sin(angular_distance)
        )

        x = (
            coefficient_a
            * math.cos(start_latitude)
            * math.cos(start_longitude)
            + coefficient_b
            * math.cos(end_latitude)
            * math.cos(end_longitude)
        )

        y = (
            coefficient_a
            * math.cos(start_latitude)
            * math.sin(start_longitude)
            + coefficient_b
            * math.cos(end_latitude)
            * math.sin(end_longitude)
        )

        z = (
            coefficient_a
            * math.sin(start_latitude)
            + coefficient_b
            * math.sin(end_latitude)
        )

        latitude = math.atan2(
            z,
            math.sqrt(x * x + y * y),
        )

        longitude = math.atan2(y, x)

        route_points.append([
            round(math.degrees(latitude), 5),
            round(math.degrees(longitude), 5),
        ])

    return route_points


def estimate_destination_airport(
    latitude,
    longitude,
    heading_deg,
    velocity=None,
    on_ground=False,
):
    if (
        latitude is None
        or longitude is None
        or heading_deg is None
    ):
        return None

    try:
        latitude = float(latitude)
        longitude = float(longitude)
        heading_deg = float(heading_deg)

        if velocity is not None:
            velocity = float(velocity)

    except (TypeError, ValueError):
        return None

    if on_ground is True:
        return None

    if velocity is not None and velocity < 30:
        return None

    target_latitude, target_longitude = (
        calculate_destination_point(
            latitude,
            longitude,
            heading_deg,
            300,
        )
    )

    best_airport = None
    best_score = float("inf")
    best_target_distance = None

    excluded_name_keywords = (
        "army air base",
        "air force base",
        "military",
        "naval air",
        "airbase",
        "air base",
    )

    for airport in load_airports():
        airport_name = (
            airport.get("name") or ""
        ).lower()

        if any(
            keyword in airport_name
            for keyword in excluded_name_keywords
        ):
            continue

        distance_from_plane = calculate_distance_km(
            latitude,
            longitude,
            airport["latitude"],
            airport["longitude"],
        )

        if distance_from_plane < 40:
            continue

        distance_from_target = calculate_distance_km(
            target_latitude,
            target_longitude,
            airport["latitude"],
            airport["longitude"],
        )

        if distance_from_target > 1000:
            continue

        score = distance_from_target

        if airport.get("iata_code"):
            score *= 0.65
        else:
            score *= 1.35

        if airport.get("type") == "large_airport":
            score *= 0.70
        elif airport.get("type") == "medium_airport":
            score *= 1.00

        if score < best_score:
            best_score = score
            best_airport = airport
            best_target_distance = distance_from_target

    if best_airport is None:
        return None

    route_points = calculate_great_circle_route(
        latitude,
        longitude,
        best_airport["latitude"],
        best_airport["longitude"],
        point_count=50,
    )

    return {
        "icao_code": best_airport["icao_code"],
        "iata_code": best_airport["iata_code"],
        "name": best_airport["name"],
        "city": best_airport["city"],
        "country_code": best_airport["country_code"],
        "latitude": best_airport["latitude"],
        "longitude": best_airport["longitude"],
        "distance_km": round(
            best_target_distance,
            2,
        ),
        "target_latitude": round(
            target_latitude,
            5,
        ),
        "target_longitude": round(
            target_longitude,
            5,
        ),
        "route_points": route_points,
        "estimated": True,
    }


def find_nearest_airport(latitude, longitude):
    if latitude is None or longitude is None:
        return None

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return None

    airports = load_airports()

    nearest_airport = None
    nearest_distance = float("inf")

    for airport in airports:
        distance = calculate_distance_km(
            latitude,
            longitude,
            airport["latitude"],
            airport["longitude"],
        )

        if distance < nearest_distance:
            nearest_distance = distance
            nearest_airport = airport

    if nearest_airport is None:
        return None

    if nearest_distance > 500:
        return None

    return {
        "icao_code": nearest_airport["icao_code"],
        "iata_code": nearest_airport["iata_code"],
        "name": nearest_airport["name"],
        "city": nearest_airport["city"],
        "country_code": nearest_airport["country_code"],
        "distance_km": round(nearest_distance, 2),
        "latitude": nearest_airport["latitude"],
        "longitude": nearest_airport["longitude"],
    }
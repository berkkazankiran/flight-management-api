import requests
import traceback
from flask import Blueprint, jsonify, request

from app.database import get_connection
from app.services import (
    fetch_live_flights,
    get_saved_live_flights,
    publish_flights_to_kafka,
    find_nearest_airport,
    estimate_destination_airport,
    find_airport_by_icao,
    get_opensky_flight_route,
)


main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def home():
    return (
        "<h1>Flight API</h1>"
        "<p>Flask ve PostgreSQL Docker içinde çalışıyor.</p>"
    )


@main_bp.route("/db-test")
def db_test():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]

        return jsonify({
            "status": "success",
            "database": "PostgreSQL",
            "version": version,
        })

    finally:
        cursor.close()
        connection.close()


@main_bp.route("/flights")
def flights():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            SELECT id, departure, arrival
            FROM flights
            ORDER BY id;
        """)

        rows = cursor.fetchall()

        return jsonify([
            {
                "id": row[0],
                "departure": row[1],
                "arrival": row[2],
            }
            for row in rows
        ])

    finally:
        cursor.close()
        connection.close()


@main_bp.route("/api/flights/live")
def live_flights():
    try:
        bounds = None

        raw_values = {
            "lamin": request.args.get("lamin"),
            "lomin": request.args.get("lomin"),
            "lamax": request.args.get("lamax"),
            "lomax": request.args.get("lomax"),
        }

        provided_values = [
            value
            for value in raw_values.values()
            if value is not None
        ]

        if provided_values:
            if len(provided_values) != 4:
                return jsonify({
                    "status": "error",
                    "message": (
                        "Harita sınırları için lamin, lomin, "
                        "lamax ve lomax birlikte gönderilmelidir."
                    ),
                }), 400

            try:
                bounds = {
                    key: float(value)
                    for key, value in raw_values.items()
                }
            except (TypeError, ValueError):
                return jsonify({
                    "status": "error",
                    "message": "Harita sınırları sayısal olmalıdır.",
                }), 400

            if not -90 <= bounds["lamin"] <= 90:
                return jsonify({
                    "status": "error",
                    "message": "lamin -90 ile 90 arasında olmalıdır.",
                }), 400

            if not -90 <= bounds["lamax"] <= 90:
                return jsonify({
                    "status": "error",
                    "message": "lamax -90 ile 90 arasında olmalıdır.",
                }), 400

            if not -180 <= bounds["lomin"] <= 180:
                return jsonify({
                    "status": "error",
                    "message": "lomin -180 ile 180 arasında olmalıdır.",
                }), 400

            if not -180 <= bounds["lomax"] <= 180:
                return jsonify({
                    "status": "error",
                    "message": "lomax -180 ile 180 arasında olmalıdır.",
                }), 400

            if bounds["lamin"] >= bounds["lamax"]:
                return jsonify({
                    "status": "error",
                    "message": "lamin, lamax değerinden küçük olmalıdır.",
                }), 400

            if bounds["lomin"] >= bounds["lomax"]:
                return jsonify({
                    "status": "error",
                    "message": "lomin, lomax değerinden küçük olmalıdır.",
                }), 400

        result = fetch_live_flights(bounds=bounds)
        flights = result["flights"]

        publish_flights_to_kafka(flights)

        return jsonify({
            "status": "success",
            "time": result["time"],
            "count": len(flights),
            "bounds": bounds,
            "flights": flights,
        })

    except requests.exceptions.HTTPError as error:
        status_code = (
            error.response.status_code
            if error.response is not None
            else 502
        )

        return jsonify({
            "status": "error",
            "message": "OpenSky API şu anda isteğe cevap veremiyor.",
            "opensky_status": status_code,
        }), 503

    except requests.exceptions.Timeout:
        return jsonify({
            "status": "error",
            "message": "OpenSky isteği zaman aşımına uğradı.",
        }), 504

    except requests.exceptions.RequestException as error:
        return jsonify({
            "status": "error",
            "message": "OpenSky sunucusuna bağlanılamadı.",
            "detail": str(error),
        }), 502

    except Exception as error:
        print("LIVE FLIGHTS ERROR:", repr(error))
        traceback.print_exc()

        return jsonify({
            "status": "error",
            "message": "Canlı uçuş verileri alınamadı.",
            "detail": str(error),
        }), 500

@main_bp.route("/api/flights")
def saved_live_flights():
            flights = get_saved_live_flights()

            return jsonify({
            "status": "success",
            "count": len(flights),
            "flights": flights,
        })


@main_bp.route(
    "/api/flights/history/<icao24>",
    methods=["GET"],
)
def get_flight_history(icao24):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                icao24,
                callsign,
                latitude,
                longitude,
                altitude,
                velocity,
                heading,
                on_ground,
                recorded_at
            FROM (
                SELECT
                    icao24,
                    callsign,
                    latitude,
                    longitude,
                    altitude,
                    velocity,
                    heading,
                    on_ground,
                    recorded_at
                FROM flight_history
                WHERE LOWER(icao24) = LOWER(%s)
                  AND recorded_at >=
                      CURRENT_TIMESTAMP - INTERVAL '3 hours'
                  AND latitude IS NOT NULL
                  AND longitude IS NOT NULL
                ORDER BY recorded_at DESC
                LIMIT 80
            ) AS recent_history
            ORDER BY recorded_at ASC;
            """,
            (icao24,),
        )

        rows = cursor.fetchall()

        session_start_index = 0

        for index in range(1, len(rows)):
            previous_time = rows[index - 1][8]
            current_time = rows[index][8]

            if previous_time and current_time:
                time_gap_seconds = (
                    current_time - previous_time
                ).total_seconds()

                if time_gap_seconds > 300:
                    session_start_index = index

        rows = rows[session_start_index:]

        history = []
        previous_position = None

        for row in rows:
            current_position = (
                round(float(row[2]), 5),
                round(float(row[3]), 5),
            )

            if current_position == previous_position:
                continue

            previous_position = current_position

            history.append({
                "icao24": row[0],
                "callsign": row[1],
                "latitude": row[2],
                "longitude": row[3],
                "altitude": row[4],
                "velocity": row[5],
                "heading": row[6],
                "on_ground": row[7],
                "recorded_at": (
                    row[8].isoformat()
                    if row[8]
                    else None
                ),
            })

        estimated_departure_airport = None
        estimated_destination_airport = None

        opensky_route = get_opensky_flight_route(icao24)

        if opensky_route:
            departure_icao = opensky_route.get(
                "departure_icao"
            )

            arrival_icao = opensky_route.get(
                "arrival_icao"
            )

            if departure_icao:
                estimated_departure_airport = (
                    find_airport_by_icao(
                        departure_icao
                    )
                )

            if arrival_icao:
                estimated_destination_airport = (
                    find_airport_by_icao(
                        arrival_icao
                    )
                )

        if (
            estimated_departure_airport is None
            and history
            and len(history) >= 20
        ):
            first_position = history[0]

            estimated_departure_airport = (
                find_nearest_airport(
                    first_position["latitude"],
                    first_position["longitude"],
                )
            )

        if (
            estimated_destination_airport is None
            and history
        ):
            latest_position = history[-1]

            estimated_destination_airport = (
                estimate_destination_airport(
                    latest_position.get("latitude"),
                    latest_position.get("longitude"),
                    latest_position.get("heading"),
                    latest_position.get("velocity"),
                    latest_position.get(
                        "on_ground",
                        False,
                    ),
                )
            )

        return jsonify({
            "status": "success",
            "count": len(history),
            "history": history,
            "estimated_departure_airport":
                estimated_departure_airport,
            "estimated_destination_airport":
                estimated_destination_airport,
        }), 200

    except Exception as error:
        print("HISTORY ERROR:", repr(error))
        traceback.print_exc()

        return jsonify({
            "status": "error",
            "message": "Uçuş geçmişi alınamadı.",
            "error": str(error),
        }), 500

    finally:
        cursor.close()
        connection.close()

@main_bp.route(
    "/api/aircraft/<icao24>",
    methods=["GET"],
)
        
def get_aircraft_information(icao24):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            SELECT
                registration,
                manufacturer,
                model,
                operator,
                owner,
                registered_country,
                icao_type
            FROM aircraft
            WHERE LOWER(icao24) = LOWER(%s)
            LIMIT 1;
            """,
            (icao24,),
        )

        row = cursor.fetchone()

        if row is None:
            return jsonify({
                "status": "not_found",
                "aircraft": None,
            }), 404

        return jsonify({
            "status": "success",
            "aircraft": {
                "registration": row[0],
                "manufacturer": row[1],
                "model": row[2],
                "operator": row[3],
                "owner": row[4],
                "registered_country": row[5],
                "icao_type": row[6],
            },
        })

    except Exception as error:
        traceback.print_exc()

        return jsonify({
            "status": "error",
            "message": str(error),
        }), 500

    finally:
        cursor.close()
        connection.close()

    
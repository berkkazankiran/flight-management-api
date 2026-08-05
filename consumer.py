import json
import os
import time

from confluent_kafka import Consumer, KafkaError, KafkaException
from flask_socketio import SocketIO

from app.database import(
     create_flight_history_table,
     get_connection,
)


KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "kafka:9092",
)

KAFKA_TOPIC = os.getenv(
    "KAFKA_TOPIC",
    "live-flights",
)

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://redis:6379/0",
)

socketio = SocketIO(
    message_queue=REDIS_URL,
)


def save_flight_to_database(flight):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        
        cursor.execute(
            """
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
            """,
            (
                flight["icao24"],
                flight.get("callsign"),
                flight.get("origin_country"),
                flight.get("longitude"),
                flight.get("latitude"),
                flight.get("barometric_altitude_m"),
                flight.get("velocity_m_s"),
                flight.get("heading_deg"),
                flight.get("on_ground"),
                flight.get("last_contact"),
            ),
        )

        save_flight_history(cursor, flight)

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


def publish_flight_update(flight):
    print(
        f"Socket event gönderiliyor: {flight.get('icao24')}",
        flush=True,
    )

    socketio.emit(
        "flight_update",
        flight,
        namespace="/",
    )


def create_consumer():
    return Consumer({
        "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
        "group.id": "flight-database-consumer",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False,
    })


def save_flight_history(cursor, flight):
    latitude = flight.get("latitude")
    longitude = flight.get("longitude")

    if latitude is None or longitude is None:
        return

    cursor.execute(
        """
        INSERT INTO flight_history (
            icao24,
            callsign,
            latitude,
            longitude,
            altitude,
            velocity,
            heading,
            on_ground,
            recorded_at
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            CURRENT_TIMESTAMP
        );
        """,
        (
            flight.get("icao24"),
            flight.get("callsign"),
            latitude,
            longitude,
            flight.get(
                "barometric_altitude_m",
                flight.get("altitude"),
            ),
            flight.get(
                "velocity_m_s",
                flight.get("velocity"),
            ),
            flight.get(
                "heading_deg",
                flight.get("heading"),
            ),
            flight.get("on_ground", False),
        ),
    )


def run_consumer():
    consumer = create_consumer()
    consumer.subscribe([KAFKA_TOPIC])

    print(
        f"Kafka consumer başladı. Topic dinleniyor: {KAFKA_TOPIC}",
        flush=True,
    )

    try:
        while True:
            message = consumer.poll(timeout=1.0)

            if message is None:
                continue

            if message.error():
                if message.error().code() in (
                    KafkaError._PARTITION_EOF,
                    KafkaError.UNKNOWN_TOPIC_OR_PART,
                ):
                    time.sleep(2)
                    continue

                raise KafkaException(message.error())

            try:
                flight = json.loads(
                    message.value().decode("utf-8")
                )

                save_flight_to_database(flight)

                publish_flight_update(flight)

                consumer.commit(
                    message=message,
                    asynchronous=False,
                )

                print(
                    f"Kaydedildi: {flight.get('icao24')}",
                    flush=True,
                )

            except Exception as error:
                print(
                    f"Mesaj işlenemedi: {error}",
                    flush=True,
                )
                time.sleep(1)

    except KeyboardInterrupt:
        print("Consumer durduruluyor...", flush=True)

    finally:
        consumer.close()


if __name__ == "__main__":
    create_flight_history_table()
    run_consumer()
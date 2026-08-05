import os

import psycopg2


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT"),
    )


def create_tables():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS flights (
                id SERIAL PRIMARY KEY,
                departure VARCHAR(100) NOT NULL,
                arrival VARCHAR(100) NOT NULL
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS live_flights (
                id SERIAL PRIMARY KEY,
                icao24 VARCHAR(20) UNIQUE NOT NULL,
                callsign VARCHAR(20),
                country VARCHAR(100),
                longitude DOUBLE PRECISION,
                latitude DOUBLE PRECISION,
                altitude DOUBLE PRECISION,
                velocity DOUBLE PRECISION,
                heading DOUBLE PRECISION,
                on_ground BOOLEAN,
                last_update BIGINT
            );
        """)

        connection.commit()

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
def create_flight_history_table():
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS flight_history (
                id SERIAL PRIMARY KEY,
                icao24 VARCHAR(20) NOT NULL,
                callsign VARCHAR(50),
                latitude DOUBLE PRECISION NOT NULL,
                longitude DOUBLE PRECISION NOT NULL,
                altitude DOUBLE PRECISION,
                velocity DOUBLE PRECISION,
                heading DOUBLE PRECISION,
                on_ground BOOLEAN,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_flight_history_icao24
            ON flight_history (icao24);
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_flight_history_recorded_at
            ON flight_history (recorded_at);
            """
        )

        connection.commit()

        print(
            "flight_history tablosu hazır.",
            flush=True,
        )

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()
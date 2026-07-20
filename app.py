import os

import psycopg2
from flask import Flask, jsonify

app = Flask(__name__)


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        database=os.getenv("DB_NAME", "flightdb"),
        user=os.getenv("DB_USER", "berk"),
        password=os.getenv("DB_PASSWORD", "1234"),
        port=os.getenv("DB_PORT", "5432"),
    )


def create_table():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS flights (
            id SERIAL PRIMARY KEY,
            departure VARCHAR(100) NOT NULL,
            arrival VARCHAR(100) NOT NULL
        );
    """)

    cursor.execute("""
        INSERT INTO flights (departure, arrival)
        SELECT 'Istanbul', 'London'
        WHERE NOT EXISTS (
            SELECT 1 FROM flights
        );
    """)

    cursor.execute("""
        INSERT INTO flights (departure, arrival)
        SELECT 'Ankara', 'Berlin'
        WHERE NOT EXISTS (
            SELECT 1 FROM flights
            WHERE departure = 'Ankara'
              AND arrival = 'Berlin'
        );
    """)

    cursor.execute("""
        INSERT INTO flights (departure, arrival)
        SELECT 'Izmir', 'Amsterdam'
        WHERE NOT EXISTS (
            SELECT 1 FROM flights
            WHERE departure = 'Izmir'
              AND arrival = 'Amsterdam'
        );
    """)

    connection.commit()
    cursor.close()
    connection.close()


@app.route("/")
def home():
    return "<h1>Flight API</h1><p>Flask ve PostgreSQL Docker içinde çalışıyor.</p>"


@app.route("/db-test")
def db_test():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]

    cursor.close()
    connection.close()

    return jsonify({
        "status": "success",
        "database": "PostgreSQL",
        "version": version
    })


@app.route("/flights")
def flights():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, departure, arrival
        FROM flights
        ORDER BY id;
    """)

    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    flight_list = []

    for row in rows:
        flight_list.append({
            "id": row[0],
            "departure": row[1],
            "arrival": row[2]
        })

    return jsonify(flight_list)


if __name__ == "__main__":
    create_table()
    app.run(host="0.0.0.0", port=5000)
import csv
import os

from app.database import get_connection


CSV_PATH = os.path.join(
    os.path.dirname(__file__),
    "app",
    "data",
    "aircraftDatabase.csv",
)

BATCH_SIZE = 1000


def clean_value(value):
    if value is None:
        return None

    cleaned_value = value.strip()

    return cleaned_value or None


def create_aircraft_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS aircraft (
            id SERIAL PRIMARY KEY,
            icao24 VARCHAR(50) UNIQUE NOT NULL,
            registration VARCHAR(255),
            manufacturer TEXT,
            model TEXT,
            operator TEXT,
            owner TEXT,
            registered_country TEXT,
            icao_type VARCHAR(255)
        );
    """)


def save_batch(cursor, batch):
    cursor.executemany(
        """
        INSERT INTO aircraft (
            icao24,
            registration,
            manufacturer,
            model,
            operator,
            owner,
            registered_country,
            icao_type
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (icao24)
        DO UPDATE SET
            registration = EXCLUDED.registration,
            manufacturer = EXCLUDED.manufacturer,
            model = EXCLUDED.model,
            operator = EXCLUDED.operator,
            owner = EXCLUDED.owner,
            registered_country = EXCLUDED.registered_country,
            icao_type = EXCLUDED.icao_type;
        """,
        batch,
    )


def import_aircraft():
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(
            f"CSV dosyası bulunamadı: {CSV_PATH}"
        )

    connection = get_connection()
    cursor = connection.cursor()

    imported_count = 0
    skipped_count = 0
    batch = []

    try:
        create_aircraft_table(cursor)
        connection.commit()

        with open(
            CSV_PATH,
            mode="r",
            encoding="utf-8-sig",
            newline="",
        ) as csv_file:
            reader = csv.DictReader(csv_file)

            for row in reader:
                icao24 = clean_value(row.get("icao24"))

                if not icao24:
                    skipped_count += 1
                    continue

                batch.append((
                    icao24.lower(),
                    clean_value(row.get("registration")),
                    clean_value(row.get("manufacturername")),
                    clean_value(row.get("model")),
                    clean_value(row.get("operator")),
                    clean_value(row.get("owner")),
                    None,
                    clean_value(row.get("typecode")),
                ))

                if len(batch) >= BATCH_SIZE:
                    save_batch(cursor, batch)
                    connection.commit()

                    imported_count += len(batch)

                    print(
                        f"{imported_count} kayıt işlendi..."
                    )

                    batch.clear()

            if batch:
                save_batch(cursor, batch)
                connection.commit()
                imported_count += len(batch)

        print()
        print("Import tamamlandı.")
        print(f"Eklenen/güncellenen kayıt: {imported_count}")
        print(f"Atlanan kayıt: {skipped_count}")

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    import_aircraft()
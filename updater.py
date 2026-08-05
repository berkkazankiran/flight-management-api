import os
import time

import requests

from app.services import fetch_live_flights, publish_flights_to_kafka


UPDATE_INTERVAL_SECONDS = int(
    os.getenv("UPDATE_INTERVAL_SECONDS", "60")
)


def run_updater():
    print(
        f"Uçuş güncelleyici başladı. "
        f"Güncelleme aralığı: {UPDATE_INTERVAL_SECONDS} saniye",
        flush=True,
    )

    while True:
        try:
            result = fetch_live_flights()
            flights = result["flights"]

            publish_flights_to_kafka(flights)

            print(
                f"{len(flights)} uçuş Kafka'ya gönderildi.",
                flush=True,
            )

        except requests.exceptions.HTTPError as error:
            status_code = (
                error.response.status_code
                if error.response is not None
                else "bilinmiyor"
            )

            print(
                f"OpenSky HTTP hatası: {status_code}",
                flush=True,
            )

        except requests.exceptions.Timeout:
            print(
                "OpenSky isteği zaman aşımına uğradı.",
                flush=True,
            )

        except requests.exceptions.RequestException as error:
            print(
                f"OpenSky bağlantı hatası: {error}",
                flush=True,
            )

        except Exception as error:
            print(
                f"Güncelleme işlemi başarısız: {error}",
                flush=True,
            )

        time.sleep(UPDATE_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_updater()
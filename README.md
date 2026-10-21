
# Flight Management API

A full-stack flight tracking project built with Flask, React, PostgreSQL, Apache Kafka and Redis. It retrieves aircraft state data from OpenSky Network, displays flights on an interactive map, stores position history and pushes updates to the browser through Socket.IO.

## Features

- Interactive Leaflet map with aircraft markers and flight selection.
- Search by callsign or ICAO24 identifier and filter by origin country.
- Live data requests restricted to the current map bounds.
- Flight details, position history and flight trails.
- Aircraft metadata imported from the included CSV dataset.
- Departure and destination information from OpenSky when available, with location-based estimates as a fallback.
- Kafka producer/consumer pipeline for database updates.
- Socket.IO updates distributed through Redis.
- Docker Compose setup and Kubernetes deployment manifests.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, Leaflet, React Leaflet, Axios, Socket.IO Client |
| Backend | Python 3.12, Flask, Flask-CORS, Flask-SocketIO |
| Database | PostgreSQL 17, psycopg2, pgAdmin |
| Messaging | Apache Kafka, confluent-kafka |
| Event distribution | Redis 7 |
| Infrastructure | Docker, Docker Compose, Nginx, Kubernetes |
| Flight data | OpenSky Network API |

## How it works

The updater retrieves flight data from OpenSky at a configurable interval and publishes individual aircraft records to the `live-flights` Kafka topic. The consumer saves the latest position and historical records in PostgreSQL, then emits `flight_update` events through Redis and Flask-SocketIO. The React interface receives these events and updates its aircraft markers.

The browser also calls the live endpoint on initial load, map-bound changes and manual refresh. This endpoint retrieves OpenSky data and publishes it to Kafka as well.

## Run locally with Docker Compose

### 1. Requirements

- Git and Docker with Docker Compose support. On Windows, start Docker Desktop first.
- OpenSky API client credentials (`client_id` and `client_secret`).
- Internet access for container downloads, flight data and map tiles.

Python and Node.js run inside the containers; they do not need to be installed on the host for this setup.

### 2. Clone the repository

```bash
git clone https://github.com/berkkazankiran/flight-management-api.git
cd flight-management-api
```

### 3. Configure environment variables

Create a file named `.env` next to `docker-compose.yml`:

```dotenv
OPENSKY_CLIENT_ID=your_opensky_client_id
OPENSKY_CLIENT_SECRET=your_opensky_client_secret
KAFKA_BOOTSTRAP_SERVERS=kafka:29092
KAFKA_TOPIC=live-flights
REDIS_URL=redis://redis:6379/0
UPDATE_INTERVAL_SECONDS=60
SECRET_KEY=replace_with_a_random_local_secret
```

Replace the OpenSky credential placeholders with your own values. The Kafka address above is the internal listener configured in Docker Compose. The database connection variables are already supplied by Compose. Keep `.env` out of Git; it is covered by `.gitignore`.

### 4. Start the services

```bash
docker compose up --build -d
docker compose ps
```

The stack starts the frontend, API, PostgreSQL, pgAdmin, Redis, Kafka, updater and consumer. Allow time for the first image build and service startup.

| Service | Local address |
| --- | --- |
| Flight tracking interface | http://localhost:5173 |
| Flask API | http://localhost:5000 |
| Database connection check | http://localhost:5000/db-test |
| pgAdmin | http://localhost:8080 |

The included local pgAdmin login is `admin@flight.com` / `1234`. To register PostgreSQL in pgAdmin, use host `db`, port `5432`, database `flightdb`, user `berk` and password `1234`.

The Compose file contains development database and pgAdmin passwords. Change them before exposing services outside your computer. Updating only `.env` will not override passwords explicitly set in `docker-compose.yml`.

### 5. Import aircraft metadata

After the API and database are ready, run:

```bash
docker compose exec web python import_aircraft.py
```

This imports `app/data/aircraftDatabase.csv` and creates the `aircraft` table. The metadata endpoint requires this import. The main `flights` and `live_flights` tables are created by the API; the consumer creates `flight_history`.

### Logs and shutdown

```bash
docker compose logs --tail=100 web updater consumer
docker compose down
```

`docker compose down` retains the named database volumes.

## API endpoints

All endpoints below use `GET`.

| Endpoint | Description |
| --- | --- |
| `/` | Basic API landing page |
| `/db-test` | Check PostgreSQL connectivity and retrieve its version |
| `/flights` | Read departure/arrival records from the basic `flights` table |
| `/api/flights/live` | Fetch OpenSky state data and publish records to Kafka |
| `/api/flights` | Read the latest aircraft records stored in PostgreSQL |
| `/api/flights/history/<icao24>` | Read recent position history and route information or estimates |
| `/api/aircraft/<icao24>` | Read imported aircraft metadata |

The basic `/flights` table is separate from live aircraft data and may be empty on a fresh installation.

### Example requests

These commands also work in Windows CMD or PowerShell using `curl.exe`:

```bash
curl.exe http://localhost:5000/db-test
curl.exe http://localhost:5000/api/flights
curl.exe "http://localhost:5000/api/flights/live?lamin=35&lomin=25&lamax=43&lomax=45"
```

For history or metadata, replace `<icao24>` in the endpoint with an identifier returned by a flight query. Bounding-box requests require all four numeric parameters: `lamin`, `lomin`, `lamax`, `lomax`. Minimum latitude/longitude must be smaller than the corresponding maximum.

The history endpoint reads up to 80 recent records from the last three hours, keeps the latest session after gaps longer than five minutes, and removes consecutive duplicate positions.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/routes.py` | HTTP endpoints and request validation |
| `app/services.py` | OpenSky integration, Kafka publishing and airport estimation |
| `app/database.py` | PostgreSQL connections and table creation |
| `app/data/` | Aircraft and airport CSV datasets |
| `updater.py` | Periodic OpenSky polling and Kafka publishing |
| `consumer.py` | Kafka consumption, database writes and Socket.IO events |
| `import_aircraft.py` | Aircraft CSV import |
| `run.py` | Flask-SocketIO application entry point |
| `frontend/` | React map interface and Nginx container |
| `docker-compose.yml` | Local service orchestration |
| `k8s/` | Kubernetes deployment, service and configuration manifests |

## Kubernetes

The `k8s/` directory includes manifests for the API, frontend, PostgreSQL, Redis, Kafka, updater and consumer. They reference prebuilt `berkkazankiran/flight-*` images and a separately supplied Secret named `flight-secrets`. The Secret manifest is excluded from Git.

Deployment requires accessible images, appropriate Secret values (including database and OpenSky credentials), storage support and browser-accessible API configuration. The Compose instructions above are the documented local quick start; Kubernetes requires configuration for the target cluster.

## Troubleshooting and limitations

- **Missing `.env`:** Create it in the repository root before starting Compose.
- **OpenSky authentication or request errors:** Check client credentials and the updater/API logs. Available data and request limits depend on the external service.
- **Kafka connection errors:** Check that Kafka has started and that `.env` uses `KAFKA_BOOTSTRAP_SERVERS=kafka:29092` for Compose.
- **First-start table errors:** The consumer can start before the API creates its tables. Once `/db-test` responds successfully and the API startup completes, run `docker compose restart consumer`.
- **Aircraft metadata missing:** Run the CSV import. Some ICAO24 identifiers may not exist in the dataset.
- **Port conflicts:** The default stack publishes ports 5000, 5173, 5432, 6379, 8080 and 9092. Stop conflicting local services or adjust the port mappings and related configuration.

Flight positions depend on OpenSky coverage and polling intervals. Airport estimates are heuristic and may be incorrect. This is a learning project using a development application server, rather than an operational aviation system.

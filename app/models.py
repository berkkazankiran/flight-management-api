from app.database import db


class Flight(db.Model):
    __tablename__ = "flights"


    id = db.Column(db.Integer, primary_key=True)


    icao24 = db.Column(db.String(20), unique=True, nullable=False)
    callsign = db.Column(db.String(20))
    country = db.Column(db.String(100))

    longitude = db.Column(db.Float)
    latitude = db.Column(db.Float)

    altitude = db.Column(db.Float)
    velocity = db.Column(db.Float)
    heading = db.Column(db.Float)

    on_ground = db.Column(db.Boolean)

    last_update = db.Column(db.BigInteger)
class Aircraft(db.Model):
    __tablename__ = "aircraft"

    id = db.Column(db.Integer, primary_key=True)

    icao24 = db.Column(db.String(20), unique=True, nullable=False)

    registration = db.Column(db.String(30))

    manufacturer = db.Column(db.String(100))

    model = db.Column(db.String(150))

    operator = db.Column(db.String(150))

    owner = db.Column(db.String(150))

    registered_country = db.Column(db.String(80))

    icao_type = db.Column(db.String(20))
import os


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://berk:1234@db:5432/flightdb",
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from app.database import create_tables
from app.extensions import socketio


def create_app():
    load_dotenv()

    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.getenv(
        "SECRET_KEY",
        "flight-tracking-secret-key",
    )

    redis_url = os.getenv(
        "REDIS_URL",
        "redis://redis:6379/0",
    )

    CORS(
        app,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ]
            }
        },
    )

    socketio.init_app(
        app,
        cors_allowed_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        message_queue=redis_url,
        async_mode="threading",
    )

    from app.routes import main_bp

    app.register_blueprint(main_bp)

    with app.app_context():
        create_tables()

    return app
from flask import Flask


def create_app():
    app = Flask(__name__)
    app.config.from_pyfile("config.py", silent=True)

    # 默认密钥
    app.config.setdefault("SECRET_KEY", "dev-secret-key-change-in-production")
    app.config.setdefault("SQLALCHEMY_DATABASE_URI", "sqlite:///trip_planner.db")
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)

    # 注册蓝图
    from app.routes.itinerary import itinerary_bp
    from app.routes.main import main_bp
    from app.routes.trips import trips_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(trips_bp)
    app.register_blueprint(itinerary_bp)

    return app

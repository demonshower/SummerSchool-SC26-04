from flask import Blueprint, flash, redirect, render_template, url_for

trips_bp = Blueprint("trips", __name__)


@trips_bp.route("/trips")
def list():
    return render_template("trips/list.html")


@trips_bp.route("/trips/new")
def new():
    return render_template("trips/form.html")


@trips_bp.route("/trips", methods=["POST"])
def create():
    # TODO: 后续接入规划引擎
    # 临时重定向到静态结果页
    return redirect(url_for("trips.detail", trip_id=1))


@trips_bp.route("/trips/<int:trip_id>")
def detail(trip_id):
    return render_template("trips/detail.html")


@trips_bp.route("/trips/<int:trip_id>/edit")
def edit(trip_id):
    return render_template("trips/edit.html")


@trips_bp.route("/trips/<int:trip_id>/edit", methods=["POST"])
def update(trip_id):
    flash("行程已更新", "success")
    return redirect(url_for("trips.detail", trip_id=trip_id))


@trips_bp.route("/trips/<int:trip_id>/regenerate", methods=["POST"])
def regenerate(trip_id):
    flash("行程已重新生成", "success")
    return redirect(url_for("trips.detail", trip_id=trip_id))


@trips_bp.route("/trips/<int:trip_id>/delete", methods=["POST"])
def delete(trip_id):
    flash("行程已删除", "success")
    return redirect(url_for("trips.list"))

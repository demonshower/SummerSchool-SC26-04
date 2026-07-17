from flask import Blueprint, flash, redirect, request, url_for

itinerary_bp = Blueprint("itinerary", __name__)


@itinerary_bp.route("/itinerary-items/<int:item_id>/delete", methods=["POST"])
def delete(item_id):
    # TODO: 后续接入数据库
    trip_id = request.form.get("trip_id", 1, type=int)
    flash("已删除行程项目", "success")
    return redirect(url_for("trips.detail", trip_id=trip_id))


@itinerary_bp.route("/itinerary-items/<int:item_id>/edit", methods=["POST"])
def edit(item_id):
    # TODO: 后续接入数据库
    trip_id = request.form.get("trip_id", 1, type=int)
    flash("行程项目已更新", "success")
    return redirect(url_for("trips.detail", trip_id=trip_id))

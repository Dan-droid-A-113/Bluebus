from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Dashboard & Reports"])

@router.get("/analytics", response_model=schemas.AdminAnalyticsResponse)
def get_admin_analytics(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_revenue = db.query(func.sum(models.Booking.final_amount)).filter(models.Booking.status == "CONFIRMED").scalar() or 0.0
    total_bookings = db.query(models.Booking).count()
    confirmed_bookings = db.query(models.Booking).filter(models.Booking.status == "CONFIRMED").count()
    cancelled_bookings = db.query(models.Booking).filter(models.Booking.status == "CANCELLED").count()
    total_refunded = db.query(func.sum(models.Cancellation.refund_amount)).scalar() or 0.0
    active_buses = db.query(models.Bus).filter(models.Bus.is_active == True).count()
    total_trips = db.query(models.Trip).count()

    # Occupancy rate calculation
    total_seat_capacity = db.query(func.sum(models.Bus.total_seats)).join(models.Trip, models.Trip.bus_id == models.Bus.bus_id).scalar() or 1
    total_booked_seats = (
        db.query(func.count(models.Passenger.passenger_id))
        .join(models.Booking, models.Passenger.booking_id == models.Booking.booking_id)
        .filter(models.Booking.status == "CONFIRMED")
        .scalar() or 0
    )
    occupancy_rate = min(100.0, round((total_booked_seats / total_seat_capacity) * 100, 1))

    # Popular routes
    routes = db.query(models.Route).all()
    popular_routes = []
    for r in routes:
        booking_count = (
            db.query(models.Booking)
            .join(models.Trip, models.Booking.trip_id == models.Trip.trip_id)
            .filter(models.Trip.route_id == r.route_id, models.Booking.status == "CONFIRMED")
            .count()
        )
        route_revenue = (
            db.query(func.sum(models.Booking.final_amount))
            .join(models.Trip, models.Booking.trip_id == models.Trip.trip_id)
            .filter(models.Trip.route_id == r.route_id, models.Booking.status == "CONFIRMED")
            .scalar() or 0.0
        )
        popular_routes.append({
            "route": f"{r.source_city} → {r.destination_city}",
            "bookings": booking_count,
            "revenue": round(route_revenue, 2),
            "distance_km": r.distance_km
        })
    popular_routes.sort(key=lambda x: x["bookings"], reverse=True)

    # Operator performance
    operators = db.query(models.Operator).all()
    op_perf = []
    for op in operators:
        op_buses_count = len(op.buses)
        op_bookings = (
            db.query(models.Booking)
            .join(models.Trip, models.Booking.trip_id == models.Trip.trip_id)
            .join(models.Bus, models.Trip.bus_id == models.Bus.bus_id)
            .filter(models.Bus.operator_id == op.operator_id, models.Booking.status == "CONFIRMED")
            .count()
        )
        op_rev = (
            db.query(func.sum(models.Booking.final_amount))
            .join(models.Trip, models.Booking.trip_id == models.Trip.trip_id)
            .join(models.Bus, models.Trip.bus_id == models.Bus.bus_id)
            .filter(models.Bus.operator_id == op.operator_id, models.Booking.status == "CONFIRMED")
            .scalar() or 0.0
        )
        op_perf.append({
            "operator_name": op.name,
            "rating": op.rating,
            "fleet_size": op_buses_count,
            "bookings": op_bookings,
            "revenue": round(op_rev, 2)
        })
    op_perf.sort(key=lambda x: x["revenue"], reverse=True)

    # Recent bookings
    recent_raw = db.query(models.Booking).order_by(models.Booking.booking_date.desc()).limit(10).all()
    recent_bookings = []
    for b in recent_raw:
        recent_bookings.append({
            "booking_id": b.booking_id,
            "pnr_number": b.pnr_number,
            "user_email": b.user.email,
            "customer_name": b.user.full_name,
            "travel_date": b.trip.travel_date,
            "route": f"{b.trip.route.source_city} → {b.trip.route.destination_city}",
            "seats": ", ".join([p.seat_number for p in b.passengers]),
            "passengers_count": len(b.passengers),
            "final_amount": b.final_amount,
            "status": b.status,
            "booking_date": b.booking_date.strftime("%Y-%m-%d %H:%M")
        })

    return schemas.AdminAnalyticsResponse(
        total_revenue=round(total_revenue, 2),
        total_bookings=total_bookings,
        confirmed_bookings=confirmed_bookings,
        cancelled_bookings=cancelled_bookings,
        total_refunded=round(total_refunded, 2),
        active_buses=active_buses,
        total_trips=total_trips,
        occupancy_rate_percent=occupancy_rate,
        popular_routes=popular_routes[:5],
        operator_performance=op_perf,
        recent_bookings=recent_bookings
    )

@router.get("/all-bookings")
def get_all_admin_bookings(
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.Booking).order_by(models.Booking.booking_date.desc())
    if status and status != "ALL":
        query = query.filter(models.Booking.status == status)
    if search:
        query = query.filter(
            (models.Booking.pnr_number.ilike(f"%{search}%")) |
            (models.Booking.contact_email.ilike(f"%{search}%")) |
            (models.Booking.contact_phone.ilike(f"%{search}%"))
        )
    bookings = query.all()
    out = []
    for b in bookings:
        refund_info = None
        if b.cancellation:
            refund_info = {
                "refund_amount": b.cancellation.refund_amount,
                "fee": b.cancellation.cancellation_fee,
                "refund_txn": b.cancellation.refund_transaction_id
            }
        out.append({
            "booking_id": b.booking_id,
            "pnr_number": b.pnr_number,
            "customer_name": b.user.full_name,
            "contact_email": b.contact_email,
            "contact_phone": b.contact_phone,
            "route": f"{b.trip.route.source_city} → {b.trip.route.destination_city}",
            "travel_date": b.trip.travel_date,
            "bus_name": b.trip.bus.bus_name,
            "seats": [f"{p.seat_number} ({p.name}, {p.gender[0]}/{p.age})" for p in b.passengers],
            "final_amount": b.final_amount,
            "coupon_code": b.coupon_code,
            "status": b.status,
            "refund_info": refund_info,
            "booking_date": b.booking_date.strftime("%Y-%m-%d %H:%M")
        })
    return out

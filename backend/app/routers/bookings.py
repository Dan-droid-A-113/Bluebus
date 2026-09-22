import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_user

router = APIRouter(prefix="/bookings", tags=["Bookings & Tickets"])

def generate_pnr():
    chars = "".join(random.choices(string.digits, k=6))
    return f"BB-PNR-{chars}"

def generate_txn_id():
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"TXN-BB-{chars}"

@router.post("", response_model=schemas.BookingResponse)
def create_booking(
    booking_in: schemas.BookingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trip = db.query(models.Trip).filter(models.Trip.trip_id == booking_in.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if not booking_in.passengers:
        raise HTTPException(status_code=400, detail="At least one passenger must be specified")

    # Check for already booked seats
    requested_seat_ids = [p.seat_id for p in booking_in.passengers]
    existing_confirmed_bookings = (
        db.query(models.Booking)
        .filter(models.Booking.trip_id == trip.trip_id, models.Booking.status == "CONFIRMED")
        .all()
    )
    already_booked_seat_ids = set()
    for b in existing_confirmed_bookings:
        for psg in b.passengers:
            already_booked_seat_ids.add(psg.seat_id)

    for seat_id in requested_seat_ids:
        if seat_id in already_booked_seat_ids:
            raise HTTPException(
                status_code=400, 
                detail=f"Seat ID {seat_id} is already reserved by another passenger. Please select another seat."
            )

    # Fetch seat details to compute fares
    seats = db.query(models.Seat).filter(models.Seat.seat_id.in_(requested_seat_ids)).all()
    seat_dict = {s.seat_id: s for s in seats}

    total_fare = 0.0
    passenger_records = []
    for p_in in booking_in.passengers:
        seat = seat_dict.get(p_in.seat_id)
        if not seat:
            raise HTTPException(status_code=400, detail=f"Invalid seat ID {p_in.seat_id}")
        
        seat_fare = round(trip.fare * seat.price_multiplier, 2)
        total_fare += seat_fare
        passenger_records.append({
            "seat_id": seat.seat_id,
            "name": p_in.name,
            "age": p_in.age,
            "gender": p_in.gender.upper(),
            "seat_number": seat.seat_number,
            "seat_fare": seat_fare
        })

    # Validate and calculate coupon discount
    discount_amount = 0.0
    applied_coupon = None
    if booking_in.coupon_code:
        coupon = (
            db.query(models.Coupon)
            .filter(
                models.Coupon.code == booking_in.coupon_code.strip().upper(),
                models.Coupon.is_active == True
            )
            .first()
        )
        if coupon and total_fare >= coupon.min_booking_amount:
            if coupon.discount_type == "PERCENTAGE":
                calc_discount = (total_fare * coupon.discount_val) / 100.0
                discount_amount = min(calc_discount, coupon.max_discount)
            else:
                discount_amount = min(coupon.discount_val, coupon.max_discount)
            coupon.used_count += 1
            applied_coupon = coupon.code

    final_amount = max(0.0, total_fare - discount_amount)
    pnr = generate_pnr()

    # Create Booking
    booking = models.Booking(
        pnr_number=pnr,
        user_id=current_user.user_id,
        trip_id=trip.trip_id,
        boarding_point_id=booking_in.boarding_point_id,
        dropping_point_id=booking_in.dropping_point_id,
        booking_date=datetime.utcnow(),
        total_amount=total_fare,
        discount_amount=discount_amount,
        final_amount=final_amount,
        coupon_code=applied_coupon,
        contact_email=booking_in.contact_email,
        contact_phone=booking_in.contact_phone,
        status="CONFIRMED"
    )
    db.add(booking)
    db.flush()

    # Add Passengers
    for pr in passenger_records:
        psg = models.Passenger(
            booking_id=booking.booking_id,
            seat_id=pr["seat_id"],
            name=pr["name"],
            age=pr["age"],
            gender=pr["gender"],
            seat_number=pr["seat_number"],
            seat_fare=pr["seat_fare"]
        )
        db.add(psg)

    # Record Payment Transaction
    txn_id = generate_txn_id()
    payment = models.Payment(
        booking_id=booking.booking_id,
        transaction_id=txn_id,
        payment_method=booking_in.payment_method or "UPI",
        amount=final_amount,
        status="SUCCESS",
        payment_time=datetime.utcnow()
    )
    db.add(payment)
    db.commit()
    db.refresh(booking)

    return get_booking_details_response(booking, db)

@router.get("/my", response_model=List[schemas.BookingResponse])
def get_my_bookings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.user_id == current_user.user_id)
        .order_by(models.Booking.booking_date.desc())
        .all()
    )
    return [get_booking_details_response(b, db) for b in bookings]

@router.get("/pnr/{pnr}", response_model=schemas.BookingResponse)
def get_booking_by_pnr(pnr: str, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.pnr_number == pnr.strip().upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking with given PNR not found")
    return get_booking_details_response(booking, db)

@router.post("/{pnr}/swap-seat", response_model=schemas.SeatSwapResponse)
def swap_passenger_seat(
    pnr: str,
    swap_in: schemas.SeatSwapRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.pnr_number == pnr.strip().upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status == "CANCELLED":
        raise HTTPException(status_code=400, detail="Cannot swap seat for a cancelled booking")

    # Verify passenger belongs to this booking
    passenger = db.query(models.Passenger).filter(
        models.Passenger.passenger_id == swap_in.passenger_id,
        models.Passenger.booking_id == booking.booking_id
    ).first()
    if not passenger:
        raise HTTPException(status_code=404, detail="Passenger not found on this booking")

    # Verify target seat
    target_seat = db.query(models.Seat).filter(models.Seat.seat_id == swap_in.new_seat_id).first()
    if not target_seat or target_seat.bus_id != booking.trip.bus_id:
        raise HTTPException(status_code=400, detail="Invalid target seat for this bus")

    # Verify target seat is not currently booked by another active booking on this trip
    confirmed_bookings = (
        db.query(models.Booking)
        .filter(models.Booking.trip_id == booking.trip_id, models.Booking.status == "CONFIRMED")
        .all()
    )
    booked_seat_ids = {
        psg.seat_id for b in confirmed_bookings for psg in b.passengers
    }
    if target_seat.seat_id in booked_seat_ids:
        raise HTTPException(status_code=400, detail=f"Seat {target_seat.seat_number} is already occupied.")

    old_seat_no = passenger.seat_number
    # Execute swap
    passenger.seat_id = target_seat.seat_id
    passenger.seat_number = target_seat.seat_number
    passenger.seat_fare = round(booking.trip.fare * target_seat.price_multiplier, 2)
    db.commit()

    return schemas.SeatSwapResponse(
        success=True,
        message=f"Seat swapped successfully from {old_seat_no} to {target_seat.seat_number} for passenger {passenger.name}!",
        old_seat_number=old_seat_no,
        new_seat_number=target_seat.seat_number,
        passenger_name=passenger.name
    )

def get_booking_details_response(booking: models.Booking, db: Session) -> schemas.BookingResponse:
    trip = booking.trip
    bus = trip.bus
    route = trip.route
    operator = bus.operator

    boarding_text = None
    if booking.boarding_point:
        boarding_text = f"{booking.boarding_point.stop_name} ({booking.boarding_point.landmark or ''})"

    dropping_text = None
    if booking.dropping_point:
        dropping_text = f"{booking.dropping_point.stop_name} ({booking.dropping_point.landmark or ''})"

    passengers_list = [
        schemas.PassengerResponse.model_validate(p) for p in booking.passengers
    ]

    payment_resp = schemas.PaymentResponse.model_validate(booking.payment) if booking.payment else None
    cancellation_resp = schemas.CancellationResponse.model_validate(booking.cancellation) if booking.cancellation else None

    return schemas.BookingResponse(
        booking_id=booking.booking_id,
        pnr_number=booking.pnr_number,
        user_id=booking.user_id,
        trip_id=booking.trip_id,
        booking_date=booking.booking_date,
        total_amount=booking.total_amount,
        discount_amount=booking.discount_amount,
        final_amount=booking.final_amount,
        coupon_code=booking.coupon_code,
        contact_email=booking.contact_email,
        contact_phone=booking.contact_phone,
        status=booking.status,
        source_city=route.source_city,
        destination_city=route.destination_city,
        travel_date=trip.travel_date,
        departure_time=trip.departure_time,
        arrival_time=trip.arrival_time,
        bus_name=bus.bus_name,
        bus_type=bus.bus_type,
        operator_name=operator.name,
        boarding_point=boarding_text,
        dropping_point=dropping_text,
        passengers=passengers_list,
        payment=payment_resp,
        cancellation=cancellation_resp
    )

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
        if not getattr(seat, "is_operable", True):
            raise HTTPException(status_code=400, detail=f"Seat {seat.seat_number} is out of service / inoperable ({seat.inoperable_reason or 'Damaged'}).")
        
        seat_fare = round(trip.fare * seat.price_multiplier, 2)
        total_fare += seat_fare
        passenger_records.append({
            "seat_id": seat.seat_id,
            "name": p_in.name,
            "age": p_in.age,
            "gender": p_in.gender.upper(),
            "seat_number": seat.seat_number,
            "seat_fare": seat_fare,
            "caption": (p_in.caption.strip() if p_in.caption else None)
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
            seat_fare=pr["seat_fare"],
            caption=pr.get("caption")
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

def format_swap_request_response(r: models.SeatSwapRequest) -> schemas.PeerSwapRequestResponse:
    trip = r.trip
    route = trip.route if trip else None
    bus = trip.bus if trip else None
    req_booking = r.requester_booking
    tgt_booking = r.target_booking
    req_psg = r.requester_passenger
    tgt_psg = r.target_passenger

    return schemas.PeerSwapRequestResponse(
        request_id=r.request_id,
        trip_id=r.trip_id,
        status=r.status,
        reason=r.reason,
        created_at=r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
        updated_at=r.updated_at.strftime("%Y-%m-%d %H:%M") if r.updated_at else "",
        requester_user_name=r.requester_user.full_name if r.requester_user else "Requester",
        requester_passenger_name=req_psg.name if req_psg else "Passenger",
        requester_seat_number=r.requester_seat_number,
        requester_pnr=req_booking.pnr_number if req_booking else "",
        requester_caption=getattr(req_psg, "caption", None) if req_psg else None,
        target_user_name=r.target_user.full_name if r.target_user else "Target User",
        target_passenger_name=tgt_psg.name if tgt_psg else "Passenger",
        target_seat_number=r.target_seat_number,
        target_pnr=tgt_booking.pnr_number if tgt_booking else "",
        target_caption=getattr(tgt_psg, "caption", None) if tgt_psg else None,
        source_city=route.source_city if route else "Source",
        destination_city=route.destination_city if route else "Destination",
        travel_date=trip.travel_date if trip else "",
        departure_time=trip.departure_time if trip else "",
        bus_name=bus.bus_name if bus else "Bus"
    )

@router.get("/swap-requests/incoming", response_model=List[schemas.PeerSwapRequestResponse])
def get_incoming_swap_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    requests = (
        db.query(models.SeatSwapRequest)
        .filter(models.SeatSwapRequest.target_user_id == current_user.user_id)
        .order_by(models.SeatSwapRequest.created_at.desc())
        .all()
    )
    return [format_swap_request_response(r) for r in requests]

@router.get("/swap-requests/outgoing", response_model=List[schemas.PeerSwapRequestResponse])
def get_outgoing_swap_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    requests = (
        db.query(models.SeatSwapRequest)
        .filter(models.SeatSwapRequest.requester_user_id == current_user.user_id)
        .order_by(models.SeatSwapRequest.created_at.desc())
        .all()
    )
    return [format_swap_request_response(r) for r in requests]

@router.post("/swap-requests/{request_id}/respond")
def respond_to_swap_request(
    request_id: int,
    resp_in: schemas.PeerSwapRespondInput,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    swap_req = db.query(models.SeatSwapRequest).filter(models.SeatSwapRequest.request_id == request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap_req.target_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this swap request")

    if swap_req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is already {swap_req.status}")

    act = resp_in.action.strip().upper()
    if act == "REJECT":
        swap_req.status = "REJECTED"
        db.commit()
        return {"success": True, "message": "Seat swap request was rejected.", "status": "REJECTED"}

    if act == "ACCEPT":
        # Verify both bookings are still CONFIRMED
        req_b = swap_req.requester_booking
        tgt_b = swap_req.target_booking
        if not req_b or req_b.status != "CONFIRMED" or not tgt_b or tgt_b.status != "CONFIRMED":
            swap_req.status = "CANCELLED"
            db.commit()
            raise HTTPException(status_code=400, detail="One of the bookings is not in confirmed state.")

        req_p = swap_req.requester_passenger
        tgt_p = swap_req.target_passenger

        if not req_p or not tgt_p:
            swap_req.status = "CANCELLED"
            db.commit()
            raise HTTPException(status_code=400, detail="One of the passenger records was not found.")

        if req_p.seat_id != swap_req.requester_seat_id or tgt_p.seat_id != swap_req.target_seat_id:
            swap_req.status = "CANCELLED"
            db.commit()
            raise HTTPException(status_code=400, detail="One of the seats has already changed. Swap request cancelled.")

        # Atomic swap
        old_req_seat_id, old_req_seat_no = req_p.seat_id, req_p.seat_number
        old_tgt_seat_id, old_tgt_seat_no = tgt_p.seat_id, tgt_p.seat_number

        req_p.seat_id = old_tgt_seat_id
        req_p.seat_number = old_tgt_seat_no

        tgt_p.seat_id = old_req_seat_id
        tgt_p.seat_number = old_req_seat_no

        swap_req.status = "ACCEPTED"

        # Auto-cancel other pending requests for these passengers on this trip
        other_reqs = db.query(models.SeatSwapRequest).filter(
            models.SeatSwapRequest.trip_id == swap_req.trip_id,
            models.SeatSwapRequest.status == "PENDING",
            models.SeatSwapRequest.request_id != swap_req.request_id,
            (
                (models.SeatSwapRequest.requester_passenger_id.in_([req_p.passenger_id, tgt_p.passenger_id])) |
                (models.SeatSwapRequest.target_passenger_id.in_([req_p.passenger_id, tgt_p.passenger_id]))
            )
        ).all()
        for o in other_reqs:
            o.status = "CANCELLED"

        db.commit()

        return {
            "success": True,
            "message": f"Seat swap accepted! Your seat changed from {old_tgt_seat_no} to {tgt_p.seat_number}. Passenger {req_p.name} was moved to {req_p.seat_number}.",
            "status": "ACCEPTED",
            "your_new_seat": tgt_p.seat_number,
            "requester_new_seat": req_p.seat_number
        }

    raise HTTPException(status_code=400, detail="Invalid action. Must be ACCEPT or REJECT.")

@router.post("/swap-requests/{request_id}/cancel")
def cancel_swap_request(
    request_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    swap_req = db.query(models.SeatSwapRequest).filter(models.SeatSwapRequest.request_id == request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="Swap request not found")

    if swap_req.requester_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this request")

    if swap_req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Request is already {swap_req.status}")

    swap_req.status = "CANCELLED"
    db.commit()
    return {"success": True, "message": "Seat swap request cancelled.", "status": "CANCELLED"}


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

    if not getattr(target_seat, "is_operable", True):
        raise HTTPException(status_code=400, detail=f"Seat {target_seat.seat_number} is out of service / inoperable ({target_seat.inoperable_reason or 'Damaged'}).")

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

@router.post("/{pnr}/request-swap", response_model=schemas.PeerSwapRequestResponse)
def request_peer_seat_swap(
    pnr: str,
    swap_in: schemas.PeerSwapRequestCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(models.Booking).filter(models.Booking.pnr_number == pnr.strip().upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "CONFIRMED":
        raise HTTPException(status_code=400, detail="Cannot request seat swap for a non-confirmed booking")

    # Verify requester passenger belongs to this booking
    req_passenger = db.query(models.Passenger).filter(
        models.Passenger.passenger_id == swap_in.requester_passenger_id,
        models.Passenger.booking_id == booking.booking_id
    ).first()
    if not req_passenger:
        raise HTTPException(status_code=404, detail="Passenger not found on this booking")

    # Target seat
    target_seat = db.query(models.Seat).filter(models.Seat.seat_id == swap_in.target_seat_id).first()
    if not target_seat or target_seat.bus_id != booking.trip.bus_id:
        raise HTTPException(status_code=400, detail="Invalid target seat for this trip")

    if not getattr(target_seat, "is_operable", True):
        raise HTTPException(status_code=400, detail=f"Seat {target_seat.seat_number} is inoperable / damaged.")

    if target_seat.seat_id == req_passenger.seat_id:
        raise HTTPException(status_code=400, detail="You are already assigned to this seat.")

    # Find the passenger currently occupying the target seat on this trip
    target_passenger = (
        db.query(models.Passenger)
        .join(models.Booking, models.Passenger.booking_id == models.Booking.booking_id)
        .filter(
            models.Booking.trip_id == booking.trip_id,
            models.Booking.status == "CONFIRMED",
            models.Passenger.seat_id == target_seat.seat_id
        )
        .first()
    )
    if not target_passenger:
        raise HTTPException(status_code=400, detail=f"Seat {target_seat.seat_number} is currently empty. You can relocate directly to it!")

    target_booking = target_passenger.booking
    if target_booking.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Both seats are booked under your own account. Use direct seat swap instead.")

    # Check if there is already a pending request between these two passengers
    existing_req = db.query(models.SeatSwapRequest).filter(
        models.SeatSwapRequest.requester_passenger_id == req_passenger.passenger_id,
        models.SeatSwapRequest.target_passenger_id == target_passenger.passenger_id,
        models.SeatSwapRequest.status == "PENDING"
    ).first()
    if existing_req:
        raise HTTPException(status_code=400, detail="A pending swap request has already been sent to this passenger.")

    # Create swap request
    new_req = models.SeatSwapRequest(
        trip_id=booking.trip_id,
        requester_booking_id=booking.booking_id,
        requester_passenger_id=req_passenger.passenger_id,
        requester_user_id=booking.user_id,
        requester_seat_id=req_passenger.seat_id,
        requester_seat_number=req_passenger.seat_number,
        target_booking_id=target_booking.booking_id,
        target_passenger_id=target_passenger.passenger_id,
        target_user_id=target_booking.user_id,
        target_seat_id=target_seat.seat_id,
        target_seat_number=target_seat.seat_number,
        status="PENDING",
        reason=swap_in.reason or "Passenger requested seat swap"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    return format_swap_request_response(new_req)


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

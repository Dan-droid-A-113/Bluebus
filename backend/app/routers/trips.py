from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_admin

router = APIRouter(prefix="/trips", tags=["Trips & Seats"])

@router.get("/{trip_id}/seats", response_model=schemas.SeatLayoutResponse)
def get_trip_seat_layout(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    bus = trip.bus
    route = trip.route

    # Find already booked seats for this trip
    confirmed_bookings = (
        db.query(models.Booking)
        .filter(models.Booking.trip_id == trip_id, models.Booking.status == "CONFIRMED")
        .all()
    )

    booked_map = {} # seat_id -> {"gender": psg.gender, "age": psg.age}
    for b in confirmed_bookings:
        for psg in b.passengers:
            booked_map[psg.seat_id] = {
                "gender": psg.gender,
                "age": psg.age
            }

    all_seats = db.query(models.Seat).filter(models.Seat.bus_id == bus.bus_id).order_by(models.Seat.deck, models.Seat.row_num, models.Seat.col_num).all()

    lower_deck_seats = []
    upper_deck_seats = []

    for s in all_seats:
        is_booked = s.seat_id in booked_map
        seat_status = "AVAILABLE"
        passenger_gender = None
        passenger_age = None

        if is_booked:
            occupant = booked_map[s.seat_id]
            passenger_gender = occupant["gender"]
            passenger_age = occupant["age"]
            if passenger_gender == "FEMALE":
                seat_status = "LADIES_BOOKED"
            else:
                seat_status = "BOOKED"
        elif s.is_ladies:
            seat_status = "LADIES_RESERVED" # Ladies quota or priority

        seat_item = schemas.SeatItem(
            seat_id=s.seat_id,
            seat_number=s.seat_number,
            deck=s.deck,
            row_num=s.row_num,
            col_num=s.col_num,
            seat_type=s.seat_type,
            is_ladies=s.is_ladies,
            price=round(trip.fare * s.price_multiplier, 2),
            status=seat_status,
            passenger_gender=passenger_gender,
            passenger_age=passenger_age
        )

        if s.deck == "UPPER":
            upper_deck_seats.append(seat_item)
        else:
            lower_deck_seats.append(seat_item)

    # Boarding & Dropping stops
    boarding_stops = [s for s in route.stops if s.stop_type in ["BOARDING", "BOTH"]]
    dropping_stops = [s for s in route.stops if s.stop_type in ["DROPPING", "BOTH"]]

    available_count = len(all_seats) - len(booked_map)

    return schemas.SeatLayoutResponse(
        trip_id=trip.trip_id,
        bus_id=bus.bus_id,
        bus_name=bus.bus_name,
        bus_type=bus.bus_type,
        has_ac=bus.has_ac,
        is_sleeper=bus.is_sleeper,
        base_fare=trip.fare,
        total_seats=len(all_seats),
        available_seats_count=max(0, available_count),
        lower_deck=lower_deck_seats,
        upper_deck=upper_deck_seats,
        boarding_points=[schemas.RouteStopResponse.model_validate(s) for s in boarding_stops],
        dropping_points=[schemas.RouteStopResponse.model_validate(s) for s in dropping_stops]
    )

@router.post("", response_model=schemas.TripResponse)
def create_trip(
    trip_in: schemas.TripCreate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    bus = db.query(models.Bus).filter(models.Bus.bus_id == trip_in.bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
        
    route = db.query(models.Route).filter(models.Route.route_id == trip_in.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    new_trip = models.Trip(
        bus_id=trip_in.bus_id,
        route_id=trip_in.route_id,
        travel_date=trip_in.travel_date,
        departure_time=trip_in.departure_time,
        arrival_time=trip_in.arrival_time,
        fare=trip_in.fare,
        status="SCHEDULED"
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    # Return as TripResponse
    operator = bus.operator
    amenities_list = [a.strip() for a in bus.amenities.split(",") if a.strip()]
    return schemas.TripResponse(
        trip_id=new_trip.trip_id,
        bus_id=bus.bus_id,
        route_id=route.route_id,
        travel_date=new_trip.travel_date,
        departure_time=new_trip.departure_time,
        arrival_time=new_trip.arrival_time,
        fare=new_trip.fare,
        status=new_trip.status,
        bus_name=bus.bus_name,
        bus_number=bus.bus_number,
        bus_type=bus.bus_type,
        has_ac=bus.has_ac,
        is_sleeper=bus.is_sleeper,
        operator_name=operator.name,
        operator_rating=operator.rating,
        amenities=amenities_list,
        source_city=route.source_city,
        destination_city=route.destination_city,
        duration_mins=route.estimated_duration_mins,
        available_seats=bus.total_seats,
        total_seats=bus.total_seats,
        boarding_points=[],
        dropping_points=[]
    )

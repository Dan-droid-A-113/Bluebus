from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_admin

router = APIRouter(prefix="/buses", tags=["Buses & Operators"])

@router.get("/search", response_model=List[schemas.TripResponse])
def search_buses(
    source: str = Query(..., description="Source city, e.g. Chennai"),
    destination: str = Query(..., description="Destination city, e.g. Bangalore"),
    date: Optional[str] = Query(None, description="Travel date in YYYY-MM-DD format"),
    bus_type: Optional[str] = Query("ALL", description="Filter: ALL, AC, NON_AC, SLEEPER, SEATER"),
    operator_name: Optional[str] = Query(None, description="Filter by operator name"),
    max_price: Optional[float] = Query(None, description="Filter max fare"),
    sort_by: Optional[str] = Query("departure_asc", description="Sort: price_asc, price_desc, rating_desc, departure_asc"),
    db: Session = Depends(get_db)
):
    query = (
        db.query(models.Trip)
        .join(models.Route, models.Trip.route_id == models.Route.route_id)
        .join(models.Bus, models.Trip.bus_id == models.Bus.bus_id)
        .join(models.Operator, models.Bus.operator_id == models.Operator.operator_id)
        .filter(
            models.Route.source_city.ilike(f"%{source.strip()}%"),
            models.Route.destination_city.ilike(f"%{destination.strip()}%")
        )
    )

    if date:
        query = query.filter(models.Trip.travel_date == date)

    if operator_name and operator_name != "ALL":
        query = query.filter(models.Operator.name.ilike(f"%{operator_name.strip()}%"))

    if max_price:
        query = query.filter(models.Trip.fare <= max_price)

    # Bus type filtering
    if bus_type == "AC":
        query = query.filter(models.Bus.has_ac == True)
    elif bus_type == "NON_AC":
        query = query.filter(models.Bus.has_ac == False)
    elif bus_type == "SLEEPER":
        query = query.filter(models.Bus.is_sleeper == True)
    elif bus_type == "SEATER":
        query = query.filter(models.Bus.is_sleeper == False)

    # Sorting
    if sort_by == "price_asc":
        query = query.order_by(models.Trip.fare.asc())
    elif sort_by == "price_desc":
        query = query.order_by(models.Trip.fare.desc())
    elif sort_by == "rating_desc":
        query = query.order_by(models.Operator.rating.desc())
    else: # departure_asc
        query = query.order_by(models.Trip.departure_time.asc())

    trips = query.all()

    # If date was specified but no trips matched that exact date, return available trips for that route with updated date info
    if not trips and date:
        fallback_query = (
            db.query(models.Trip)
            .join(models.Route, models.Trip.route_id == models.Route.route_id)
            .join(models.Bus, models.Trip.bus_id == models.Bus.bus_id)
            .join(models.Operator, models.Bus.operator_id == models.Operator.operator_id)
            .filter(
                models.Route.source_city.ilike(f"%{source.strip()}%"),
                models.Route.destination_city.ilike(f"%{destination.strip()}%")
            )
        )
        trips = fallback_query.limit(10).all()

    results = []
    for t in trips:
        bus = t.bus
        route = t.route
        operator = bus.operator

        # Calculate available seats
        booked_seat_ids = [
            psg.seat_id for b in t.bookings if b.status == "CONFIRMED" for psg in b.passengers
        ]
        available_seats = max(0, bus.total_seats - len(booked_seat_ids))

        # Get boarding & dropping points
        boarding_stops = [s for s in route.stops if s.stop_type in ["BOARDING", "BOTH"]]
        dropping_stops = [s for s in route.stops if s.stop_type in ["DROPPING", "BOTH"]]

        amenities_list = [a.strip() for a in bus.amenities.split(",") if a.strip()]

        results.append(schemas.TripResponse(
            trip_id=t.trip_id,
            bus_id=bus.bus_id,
            route_id=route.route_id,
            travel_date=t.travel_date,
            departure_time=t.departure_time,
            arrival_time=t.arrival_time,
            fare=t.fare,
            status=t.status,
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
            available_seats=available_seats,
            total_seats=bus.total_seats,
            boarding_points=[schemas.RouteStopResponse.model_validate(s) for s in boarding_stops],
            dropping_points=[schemas.RouteStopResponse.model_validate(s) for s in dropping_stops]
        ))

    return results

@router.get("", response_model=List[schemas.BusResponse])
def get_all_buses(db: Session = Depends(get_db)):
    return db.query(models.Bus).filter(models.Bus.is_active == True).all()

@router.get("/operators", response_model=List[schemas.OperatorResponse])
def get_all_operators(db: Session = Depends(get_db)):
    return db.query(models.Operator).all()

@router.post("/operators", response_model=schemas.OperatorResponse)
def create_operator(
    op_in: schemas.OperatorCreate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    op = models.Operator(
        name=op_in.name,
        email=op_in.email,
        phone=op_in.phone,
        license_no=op_in.license_no,
        logo_color=op_in.logo_color or "#2563eb"
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return op

@router.post("", response_model=schemas.BusResponse)
def create_bus(
    bus_in: schemas.BusCreate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_bus = models.Bus(
        operator_id=bus_in.operator_id,
        bus_number=bus_in.bus_number,
        bus_name=bus_in.bus_name,
        bus_type=bus_in.bus_type,
        has_ac=bus_in.has_ac,
        is_sleeper=bus_in.is_sleeper,
        total_seats=bus_in.total_seats,
        amenities=bus_in.amenities,
        is_active=True
    )
    db.add(new_bus)
    db.commit()
    db.refresh(new_bus)
    return new_bus

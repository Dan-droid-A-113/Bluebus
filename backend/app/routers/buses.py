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

        # Calculate available seats (excluding both booked and inoperable/damaged seats)
        booked_seat_ids = {
            psg.seat_id for b in t.bookings if b.status == "CONFIRMED" for psg in b.passengers
        }
        operable_seats = [s for s in bus.seats if getattr(s, 'is_operable', True)]
        available_seats = len([s for s in operable_seats if s.seat_id not in booked_seat_ids])


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

    # Inoperable seats set
    inop_seats = {s.strip().upper() for s in (bus_in.inoperable_seats or []) if s.strip()}
    inop_reason = bus_in.inoperable_reason or "Damaged / Maintenance"

    seats = []
    if bus_in.is_sleeper:
        # Generate sleeper berths (e.g. 30 berths: 15 Lower L1-L15, 15 Upper U1-U15)
        for deck in ["LOWER", "UPPER"]:
            prefix = "L" if deck == "LOWER" else "U"
            idx = 1
            for r in range(1, 6):
                # Col 1: Window single
                s_num = f"{prefix}{idx}"
                seats.append(models.Seat(
                    bus_id=new_bus.bus_id,
                    seat_number=s_num,
                    deck=deck,
                    row_num=r,
                    col_num=1,
                    seat_type="SLEEPER",
                    is_ladies=(idx in [1, 4]),
                    price_multiplier=1.1 if deck == "LOWER" else 1.0,
                    is_operable=(s_num not in inop_seats),
                    inoperable_reason=(inop_reason if s_num in inop_seats else None)
                ))
                idx += 1
                # Col 3 & 4: Double berth
                for c in [3, 4]:
                    s_num = f"{prefix}{idx}"
                    seats.append(models.Seat(
                        bus_id=new_bus.bus_id,
                        seat_number=s_num,
                        deck=deck,
                        row_num=r,
                        col_num=c,
                        seat_type="SLEEPER",
                        is_ladies=False,
                        price_multiplier=1.05 if deck == "LOWER" else 0.95,
                        is_operable=(s_num not in inop_seats),
                        inoperable_reason=(inop_reason if s_num in inop_seats else None)
                    ))
                    idx += 1
    else:
        # Seater layout (2+2 layout)
        rows = max(1, bus_in.total_seats // 4)
        for r in range(1, rows + 1):
            cols = [("A", 1), ("B", 2), ("C", 4), ("D", 5)]
            for col_letter, c_num in cols:
                s_num = f"{r}{col_letter}"
                seats.append(models.Seat(
                    bus_id=new_bus.bus_id,
                    seat_number=s_num,
                    deck="LOWER",
                    row_num=r,
                    col_num=c_num,
                    seat_type="SEATER",
                    is_ladies=(col_letter in ["A", "B"] and r in [1, 2]),
                    price_multiplier=1.0,
                    is_operable=(s_num not in inop_seats),
                    inoperable_reason=(inop_reason if s_num in inop_seats else None)
                ))

    db.add_all(seats)
    db.commit()

    return new_bus

@router.get("/{bus_id}/seats")
def get_bus_seats(
    bus_id: int,
    db: Session = Depends(get_db)
):
    bus = db.query(models.Bus).filter(models.Bus.bus_id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    
    return [
        {
            "seat_id": s.seat_id,
            "seat_number": s.seat_number,
            "deck": s.deck,
            "row_num": s.row_num,
            "col_num": s.col_num,
            "seat_type": s.seat_type,
            "is_ladies": s.is_ladies,
            "price_multiplier": s.price_multiplier,
            "is_operable": getattr(s, "is_operable", True),
            "inoperable_reason": getattr(s, "inoperable_reason", None)
        }
        for s in bus.seats
    ]

@router.put("/{bus_id}/seats/{seat_number}/toggle-operable")
def toggle_bus_seat_operable(
    bus_id: int,
    seat_number: str,
    toggle_in: schemas.SeatOperableToggle,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    seat = db.query(models.Seat).filter(
        models.Seat.bus_id == bus_id,
        models.Seat.seat_number == seat_number.strip().upper()
    ).first()
    if not seat:
        raise HTTPException(status_code=404, detail=f"Seat {seat_number} not found on bus {bus_id}")

    seat.is_operable = toggle_in.is_operable
    seat.inoperable_reason = toggle_in.reason if not toggle_in.is_operable else None
    db.commit()

    status_str = "OPERABLE (Active)" if seat.is_operable else f"INOPERABLE ({seat.inoperable_reason})"
    return {
        "success": True,
        "message": f"Seat {seat.seat_number} status updated to {status_str}",
        "seat_number": seat.seat_number,
        "is_operable": seat.is_operable,
        "inoperable_reason": seat.inoperable_reason
    }


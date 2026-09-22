from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.security import get_current_admin

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get("", response_model=List[schemas.RouteResponse])
def get_all_routes(db: Session = Depends(get_db)):
    return db.query(models.Route).all()

@router.get("/cities")
def get_cities(db: Session = Depends(get_db)):
    sources = [r[0] for r in db.query(models.Route.source_city).distinct().all()]
    destinations = [r[0] for r in db.query(models.Route.destination_city).distinct().all()]
    all_cities = sorted(list(set(sources + destinations)))
    return {
        "cities": all_cities,
        "popular_sources": ["Chennai", "Bangalore", "Mumbai", "Pune", "Delhi", "Hyderabad", "Jaipur"]
    }

@router.post("", response_model=schemas.RouteResponse)
def create_route(
    route_in: schemas.RouteCreate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_route = models.Route(
        source_city=route_in.source_city,
        destination_city=route_in.destination_city,
        distance_km=route_in.distance_km,
        estimated_duration_mins=route_in.estimated_duration_mins,
        base_fare=route_in.base_fare
    )
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route

@router.post("/{route_id}/stops")
def add_route_stop(
    route_id: int,
    stop_name: str,
    stop_type: str, # BOARDING or DROPPING
    landmark: str = "",
    time_offset_mins: int = 0,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    route = db.query(models.Route).filter(models.Route.route_id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
        
    count = db.query(models.RouteStop).filter(models.RouteStop.route_id == route_id).count()
    stop = models.RouteStop(
        route_id=route_id,
        stop_name=stop_name,
        stop_type=stop_type.upper(),
        landmark=landmark,
        time_offset_mins=time_offset_mins,
        order_index=count + 1
    )
    db.add(stop)
    db.commit()
    db.refresh(stop)
    return stop

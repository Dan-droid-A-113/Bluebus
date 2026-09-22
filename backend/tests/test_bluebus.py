import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add bluebus to path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.main import app

client = TestClient(app)

def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert "Blue Bus" in res.json()["platform"]

    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_login_user():
    res = client.post("/api/auth/login", json={
        "email": "user@bluebus.com",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "PASSENGER"
    assert data["full_name"] == "Rahul Sharma"

def test_auth_login_admin():
    res = client.post("/api/auth/login", json={
        "email": "admin@bluebus.com",
        "password": "Admin123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "ADMIN"

def test_search_buses():
    res = client.get("/api/buses/search?source=Chennai&destination=Bangalore")
    assert res.status_code == 200
    trips = res.json()
    assert len(trips) > 0
    t = trips[0]
    assert t["source_city"] == "Chennai"
    assert t["destination_city"] == "Bangalore"
    assert t["available_seats"] > 0
    assert len(t["boarding_points"]) > 0
    assert len(t["dropping_points"]) > 0

def test_trip_seat_layout():
    # Fetch first trip
    trips_res = client.get("/api/buses/search?source=Chennai&destination=Bangalore")
    trip_id = trips_res.json()[0]["trip_id"]

    res = client.get(f"/api/trips/{trip_id}/seats")
    assert res.status_code == 200
    layout = res.json()
    assert "lower_deck" in layout
    assert "upper_deck" in layout
    assert len(layout["lower_deck"]) > 0
    assert len(layout["boarding_points"]) > 0

def test_coupons_and_apply():
    res = client.get("/api/coupons")
    assert res.status_code == 200
    coupons = res.json()
    assert len(coupons) >= 4
    codes = [c["code"] for c in coupons]
    assert "BLUEFIRST" in codes

    # Test apply
    apply_res = client.post("/api/coupons/apply", json={
        "code": "BLUEFIRST",
        "total_amount": 1000.0
    })
    assert apply_res.status_code == 200
    data = apply_res.json()
    assert data["valid"] is True
    assert data["discount_amount"] == 200.0
    assert data["final_amount"] == 800.0

def test_create_booking_flow():
    # Login as user
    auth_res = client.post("/api/auth/login", json={
        "email": "user@bluebus.com",
        "password": "Password123!"
    })
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get search & seats
    trips_res = client.get("/api/buses/search?source=Chennai&destination=Bangalore")
    trip = trips_res.json()[0]
    trip_id = trip["trip_id"]

    layout_res = client.get(f"/api/trips/{trip_id}/seats")
    layout = layout_res.json()

    # Pick first available seat
    avail_seats = [s for s in layout["lower_deck"] if s["status"] == "AVAILABLE"]
    assert len(avail_seats) >= 1
    selected_seat = avail_seats[0]

    b_point_id = layout["boarding_points"][0]["stop_id"] if layout["boarding_points"] else None
    d_point_id = layout["dropping_points"][0]["stop_id"] if layout["dropping_points"] else None

    # Book ticket
    book_res = client.post("/api/bookings", headers=headers, json={
        "trip_id": trip_id,
        "boarding_point_id": b_point_id,
        "dropping_point_id": d_point_id,
        "coupon_code": "BLUEFIRST",
        "contact_email": "user@bluebus.com",
        "contact_phone": "+91 98765 43210",
        "payment_method": "UPI",
        "passengers": [
            {
                "seat_id": selected_seat["seat_id"],
                "name": "Arun Kumar",
                "age": 28,
                "gender": "MALE"
            }
        ]
    })
    assert book_res.status_code == 200
    booking_data = book_res.json()
    pnr = booking_data["pnr_number"]
    assert pnr.startswith("BB-PNR-")
    assert booking_data["status"] == "CONFIRMED"
    assert len(booking_data["passengers"]) == 1
    assert booking_data["payment"]["status"] == "SUCCESS"

    # Test PNR lookup
    pnr_res = client.get(f"/api/bookings/pnr/{pnr}")
    assert pnr_res.status_code == 200
    assert pnr_res.json()["pnr_number"] == pnr

    # Test Cancellation Preview
    prev_res = client.get(f"/api/cancellations/preview/{pnr}")
    assert prev_res.status_code == 200
    assert prev_res.json()["refund_amount"] > 0

    # Test Cancellation execution
    cancel_res = client.post(f"/api/cancellations/{pnr}", headers=headers, json={
        "reason": "Testing cancellation feature"
    })
    assert cancel_res.status_code == 200
    assert cancel_res.json()["refund_status"] == "REFUNDED"
    assert cancel_res.json()["refund_transaction_id"].startswith("REF-BB-")

def test_admin_analytics():
    # Login as admin
    admin_auth = client.post("/api/auth/login", json={
        "email": "admin@bluebus.com",
        "password": "Admin123!"
    })
    admin_token = admin_auth.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/admin/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_revenue" in data
    assert "total_bookings" in data
    assert "occupancy_rate_percent" in data
    assert len(data["popular_routes"]) > 0
    assert len(data["operator_performance"]) > 0

def test_reviews():
    rev_res = client.get("/api/reviews")
    assert rev_res.status_code == 200
    reviews = rev_res.json()
    assert len(reviews) > 0
    assert reviews[0]["rating"] >= 1

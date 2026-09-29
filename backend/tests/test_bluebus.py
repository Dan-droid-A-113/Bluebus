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

def test_inoperable_seats_and_layout():
    # Fetch seat layout for trip 1
    res = client.get("/api/trips/1/seats")
    assert res.status_code == 200
    data = res.json()

    # Find the seeded inoperable seat (U15 on bus 1)
    upper_deck = data["upper_deck"]
    inop_seats = [s for s in upper_deck if s["seat_number"] == "U15"]
    assert len(inop_seats) == 1
    u15 = inop_seats[0]
    assert u15["status"] == "INOPERABLE"
    assert u15["is_operable"] is False
    assert "Damaged" in (u15["inoperable_reason"] or "")

    # Admin toggling seat back to operable
    admin_auth = client.post("/api/auth/login", json={"email": "admin@bluebus.com", "password": "Admin123!"})
    headers = {"Authorization": f"Bearer {admin_auth.json()['access_token']}"}
    toggle_res = client.put("/api/buses/1/seats/U15/toggle-operable", headers=headers, json={"is_operable": True})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_operable"] is True

    # Toggle back to inoperable
    toggle_back = client.put("/api/buses/1/seats/U15/toggle-operable", headers=headers, json={"is_operable": False, "reason": "Damaged recliner handle"})
    assert toggle_back.status_code == 200
    assert toggle_back.json()["is_operable"] is False

import uuid

def test_peer_to_peer_seat_swap_flow():
    # 1. Login as Rahul
    rahul_auth = client.post("/api/auth/login", json={
        "email": "user@bluebus.com",
        "password": "Password123!"
    })
    assert rahul_auth.status_code == 200
    rahul_token = rahul_auth.json()["access_token"]
    rahul_headers = {"Authorization": f"Bearer {rahul_token}"}

    # 2. Login as Priya Sharma
    priya_auth = client.post("/api/auth/login", json={
        "email": "priya.sharma@example.com",
        "password": "Password123!"
    })
    assert priya_auth.status_code == 200
    priya_token = priya_auth.json()["access_token"]
    priya_headers = {"Authorization": f"Bearer {priya_token}"}

    # Get current bookings for both
    rahul_booking = client.get("/api/bookings/pnr/BB-PNR-772901").json()
    priya_booking = client.get("/api/bookings/pnr/BB-PNR-883192").json()

    rahul_psg = rahul_booking["passengers"][0]
    priya_psg = priya_booking["passengers"][0]
    rahul_seat = rahul_psg["seat_number"]
    priya_seat = priya_psg["seat_number"]

    # Check Priya's incoming pending requests
    inc_res = client.get("/api/bookings/swap-requests/incoming", headers=priya_headers)
    assert inc_res.status_code == 200
    pending_reqs = [r for r in inc_res.json() if r["status"] == "PENDING"]

    if not pending_reqs:
        # Create a new peer swap request from Rahul to Priya's seat
        create_swap = client.post(
            f"/api/bookings/BB-PNR-772901/request-swap",
            headers=rahul_headers,
            json={
                "requester_passenger_id": rahul_psg["passenger_id"],
                "target_seat_id": priya_psg["seat_id"],
                "reason": "Looking to swap seat"
            }
        )
        assert create_swap.status_code == 200
        req_id = create_swap.json()["request_id"]
    else:
        req_id = pending_reqs[0]["request_id"]

    # 3. Priya accepts the swap request
    accept_res = client.post(f"/api/bookings/swap-requests/{req_id}/respond", headers=priya_headers, json={
        "action": "ACCEPT"
    })
    assert accept_res.status_code == 200
    resp_data = accept_res.json()
    assert resp_data["status"] == "ACCEPTED"

    # 4. Verify in DB via PNR that seats actually swapped!
    rahul_pnr_after = client.get("/api/bookings/pnr/BB-PNR-772901").json()
    priya_pnr_after = client.get("/api/bookings/pnr/BB-PNR-883192").json()

    assert rahul_pnr_after["passengers"][0]["seat_number"] == priya_seat
    assert priya_pnr_after["passengers"][0]["seat_number"] == rahul_seat

def test_admin_create_bus_with_inoperable_seats():
    admin_auth = client.post("/api/auth/login", json={"email": "admin@bluebus.com", "password": "Admin123!"})
    headers = {"Authorization": f"Bearer {admin_auth.json()['access_token']}"}

    unique_bus_no = f"KA-01-TEST-{uuid.uuid4().hex[:6].upper()}"
    create_res = client.post("/api/buses", headers=headers, json={
        "operator_id": 1,
        "bus_number": unique_bus_no,
        "bus_name": "Test Express Sleeper",
        "bus_type": "AC Sleeper (2+1)",
        "has_ac": True,
        "is_sleeper": True,
        "total_seats": 30,
        "amenities": "WiFi,GPS",
        "inoperable_seats": ["L2", "U5"],
        "inoperable_reason": "Broken cushion"
    })
    assert create_res.status_code == 200
    bus_data = create_res.json()
    new_bus_id = bus_data["bus_id"]

    # Verify seats via get_bus_seats
    seats_res = client.get(f"/api/buses/{new_bus_id}/seats")
    assert seats_res.status_code == 200
    seats = seats_res.json()
    assert len(seats) == 30

    l2 = [s for s in seats if s["seat_number"] == "L2"][0]
    assert l2["is_operable"] is False
    assert l2["inoperable_reason"] == "Broken cushion"

    u5 = [s for s in seats if s["seat_number"] == "U5"][0]
    assert u5["is_operable"] is False

    l1 = [s for s in seats if s["seat_number"] == "L1"][0]
    assert l1["is_operable"] is True

def test_passenger_travel_captions():
    # 1. Verify trip 1 layout returns passenger_caption for booked seats
    layout_res = client.get("/api/trips/1/seats")
    assert layout_res.status_code == 200
    layout = layout_res.json()
    all_seats = layout["lower_deck"] + layout["upper_deck"]

    # Check Priya's or Rahul's seat
    booked_with_caption = [s for s in all_seats if s["status"] in ["BOOKED", "LADIES_BOOKED"] and s["passenger_caption"]]
    assert len(booked_with_caption) >= 1
    sample = booked_with_caption[0]
    assert sample["passenger_caption"] is not None

    # 2. Book a new seat with a custom caption
    auth = client.post("/api/auth/login", json={"email": "user@bluebus.com", "password": "Password123!"})
    headers = {"Authorization": f"Bearer {auth.json()['access_token']}"}

    # Find an available seat
    avail = [s for s in all_seats if s["status"] == "AVAILABLE" and s["is_operable"]][0]

    book_res = client.post("/api/bookings", headers=headers, json={
        "trip_id": 1,
        "contact_email": "user@bluebus.com",
        "contact_phone": "9876543210",
        "payment_method": "UPI",
        "passengers": [
            {
                "seat_id": avail["seat_id"],
                "name": "Kavitha Raj",
                "age": 31,
                "gender": "FEMALE",
                "caption": "♿ In a wheelchair, needs mobility help"
            }
        ]
    })
    assert book_res.status_code == 200
    b_data = book_res.json()
    assert b_data["passengers"][0]["caption"] == "♿ In a wheelchair, needs mobility help"

    # 3. Check that the trip layout now reflects this new caption on the seat
    updated_layout = client.get("/api/trips/1/seats").json()
    updated_all = updated_layout["lower_deck"] + updated_layout["upper_deck"]
    matched = [s for s in updated_all if s["seat_id"] == avail["seat_id"]][0]
    assert matched["status"] in ["BOOKED", "LADIES_BOOKED"]
    assert matched["passenger_caption"] == "♿ In a wheelchair, needs mobility help"



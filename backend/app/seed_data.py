from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.app import models
from backend.app.database import engine, Base
from backend.app.security import get_password_hash

from sqlalchemy import text

def seed_database(db: Session):
    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)

    # Migrate columns if DB already existed
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE seats ADD COLUMN is_operable BOOLEAN DEFAULT 1"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE seats ADD COLUMN inoperable_reason VARCHAR(100)"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE passengers ADD COLUMN caption VARCHAR(200)"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("UPDATE passengers SET caption = '👶 Carrying a baby, prefer lower berth' WHERE name = 'Priya Sharma' AND (caption IS NULL OR caption = '')"))
            conn.execute(text("UPDATE passengers SET caption = '🪟 Sound sleeper, prefer window berth' WHERE name = 'Rahul Sharma' AND (caption IS NULL OR caption = '')"))
            conn.commit()
    except Exception:
        pass

    # Check if already seeded
    if db.query(models.User).first():
        return


    print("[Blue Bus] Initializing database with RedBus-style seed records...")

    # 1. Users
    pwd_user = get_password_hash("Password123!")
    pwd_admin = get_password_hash("Admin123!")

    u_user = models.User(
        email="user@bluebus.com",
        password_hash=pwd_user,
        full_name="Rahul Sharma",
        phone="+91 98765 43210",
        gender="MALE",
        age=29,
        role="PASSENGER",
        is_active=True
    )
    u_admin = models.User(
        email="admin@bluebus.com",
        password_hash=pwd_admin,
        full_name="Blue Bus Admin",
        phone="+91 91234 56789",
        gender="MALE",
        age=35,
        role="ADMIN",
        is_active=True
    )
    u_priya = models.User(
        email="priya.sharma@example.com",
        password_hash=pwd_user,
        full_name="Priya Sharma",
        phone="+91 94441 22334",
        gender="FEMALE",
        age=27,
        role="PASSENGER",
        is_active=True
    )

    db.add_all([u_user, u_admin, u_priya])
    db.commit()

    # 2. Operators
    op_blue = models.Operator(
        name="BlueBus Prime",
        email="prime@bluebus.com",
        phone="+91 80001 23456",
        license_no="LIC-BB-2026-001",
        rating=4.8,
        logo_color="#2563eb"
    )
    op_srs = models.Operator(
        name="SRS Travels",
        email="bookings@srstravels.in",
        phone="+91 80002 34567",
        license_no="LIC-SRS-2026-042",
        rating=4.5,
        logo_color="#0284c7"
    )
    op_orange = models.Operator(
        name="Orange Tours & Travels",
        email="support@orangetravels.com",
        phone="+91 80003 45678",
        license_no="LIC-ORG-2026-108",
        rating=4.7,
        logo_color="#ea580c"
    )
    op_kpn = models.Operator(
        name="KPN Travels",
        email="info@kpntravels.com",
        phone="+91 80004 56789",
        license_no="LIC-KPN-2026-077",
        rating=4.4,
        logo_color="#16a34a"
    )
    op_vrl = models.Operator(
        name="VRL Logistics",
        email="care@vrlgroup.in",
        phone="+91 80005 67890",
        license_no="LIC-VRL-2026-993",
        rating=4.6,
        logo_color="#7c3aed"
    )

    db.add_all([op_blue, op_srs, op_orange, op_kpn, op_vrl])
    db.commit()

    # 3. Routes
    r_chn_blr = models.Route(source_city="Chennai", destination_city="Bangalore", distance_km=350.0, estimated_duration_mins=390, base_fare=750.0)
    r_blr_chn = models.Route(source_city="Bangalore", destination_city="Chennai", distance_km=350.0, estimated_duration_mins=390, base_fare=750.0)
    r_mum_pun = models.Route(source_city="Mumbai", destination_city="Pune", distance_km=150.0, estimated_duration_mins=180, base_fare=450.0)
    r_pun_mum = models.Route(source_city="Pune", destination_city="Mumbai", distance_km=150.0, estimated_duration_mins=180, base_fare=450.0)
    r_blr_hyd = models.Route(source_city="Bangalore", destination_city="Hyderabad", distance_km=570.0, estimated_duration_mins=540, base_fare=950.0)
    r_del_jai = models.Route(source_city="Delhi", destination_city="Jaipur", distance_km=280.0, estimated_duration_mins=300, base_fare=600.0)

    db.add_all([r_chn_blr, r_blr_chn, r_mum_pun, r_pun_mum, r_blr_hyd, r_del_jai])
    db.commit()

    # 4. Route Stops (Boarding & Dropping)
    stops = [
        # Chennai -> Bangalore
        models.RouteStop(route_id=r_chn_blr.route_id, stop_name="Koyambedu Omni Bus Stand", stop_type="BOARDING", landmark="Near Rohini Theatre", time_offset_mins=0, order_index=1),
        models.RouteStop(route_id=r_chn_blr.route_id, stop_name="Guindy Kathipara", stop_type="BOARDING", landmark="Near Metro Station", time_offset_mins=30, order_index=2),
        models.RouteStop(route_id=r_chn_blr.route_id, stop_name="Tambaram Sanatorium", stop_type="BOARDING", landmark="MEPZ Gate", time_offset_mins=60, order_index=3),
        models.RouteStop(route_id=r_chn_blr.route_id, stop_name="Electronic City Toll", stop_type="DROPPING", landmark="Elevated Tollway Exit", time_offset_mins=330, order_index=4),
        models.RouteStop(route_id=r_chn_blr.route_id, stop_name="Silk Board Junction", stop_type="DROPPING", landmark="Petrol Bunk", time_offset_mins=360, order_index=5),
        models.RouteStop(route_id=r_chn_blr.route_id, stop_name="Majestic Bus Station", stop_type="DROPPING", landmark="Platform 3", time_offset_mins=390, order_index=6),
        
        # Bangalore -> Chennai
        models.RouteStop(route_id=r_blr_chn.route_id, stop_name="Majestic Bus Station", stop_type="BOARDING", landmark="Platform 1", time_offset_mins=0, order_index=1),
        models.RouteStop(route_id=r_blr_chn.route_id, stop_name="Silk Board", stop_type="BOARDING", landmark="Silk Board flyover", time_offset_mins=30, order_index=2),
        models.RouteStop(route_id=r_blr_chn.route_id, stop_name="Electronic City", stop_type="BOARDING", landmark="Toll plaza", time_offset_mins=50, order_index=3),
        models.RouteStop(route_id=r_blr_chn.route_id, stop_name="Sriperumbudur Toll", stop_type="DROPPING", landmark="Main toll", time_offset_mins=330, order_index=4),
        models.RouteStop(route_id=r_blr_chn.route_id, stop_name="Koyambedu", stop_type="DROPPING", landmark="Omni Bus Stand", time_offset_mins=390, order_index=5),

        # Mumbai -> Pune
        models.RouteStop(route_id=r_mum_pun.route_id, stop_name="Borivali West", stop_type="BOARDING", landmark="Gokul Hotel", time_offset_mins=0, order_index=1),
        models.RouteStop(route_id=r_mum_pun.route_id, stop_name="Dadar Asiad Bus Stand", stop_type="BOARDING", landmark="TT Circle", time_offset_mins=30, order_index=2),
        models.RouteStop(route_id=r_mum_pun.route_id, stop_name="Vashi Plaza", stop_type="BOARDING", landmark="Highway Bridge", time_offset_mins=60, order_index=3),
        models.RouteStop(route_id=r_mum_pun.route_id, stop_name="Wakad Highway", stop_type="DROPPING", landmark="Ginger Hotel", time_offset_mins=150, order_index=4),
        models.RouteStop(route_id=r_mum_pun.route_id, stop_name="Swargate", stop_type="DROPPING", landmark="Bus Terminal", time_offset_mins=180, order_index=5),

        # Bangalore -> Hyderabad
        models.RouteStop(route_id=r_blr_hyd.route_id, stop_name="Majestic Anand Rao Circle", stop_type="BOARDING", landmark="Near Petrol Pump", time_offset_mins=0, order_index=1),
        models.RouteStop(route_id=r_blr_hyd.route_id, stop_name="Hebbal Flyover", stop_type="BOARDING", landmark="Esteem Mall", time_offset_mins=30, order_index=2),
        models.RouteStop(route_id=r_blr_hyd.route_id, stop_name="Shamshabad Airport Road", stop_type="DROPPING", landmark="Airport exit", time_offset_mins=480, order_index=3),
        models.RouteStop(route_id=r_blr_hyd.route_id, stop_name="Mehdipatnam", stop_type="DROPPING", landmark="Pillar 45", time_offset_mins=510, order_index=4),
        models.RouteStop(route_id=r_blr_hyd.route_id, stop_name="MGBS Hyderabad", stop_type="DROPPING", landmark="Terminal 1", time_offset_mins=540, order_index=5),
        
        # Delhi -> Jaipur
        models.RouteStop(route_id=r_del_jai.route_id, stop_name="Kashmere Gate ISBT", stop_type="BOARDING", landmark="Metro Gate 2", time_offset_mins=0, order_index=1),
        models.RouteStop(route_id=r_del_jai.route_id, stop_name="Dhaula Kuan", stop_type="BOARDING", landmark="Metro Station", time_offset_mins=40, order_index=2),
        models.RouteStop(route_id=r_del_jai.route_id, stop_name="Sindhi Camp Bus Stand", stop_type="DROPPING", landmark="Station Exit", time_offset_mins=300, order_index=3)
    ]
    db.add_all(stops)
    db.commit()

    # 5. Buses
    b1 = models.Bus(
        operator_id=op_blue.operator_id,
        bus_number="TN-01-BB-2026",
        bus_name="BlueBus Super Luxury Sleeper",
        bus_type="AC Sleeper (2+1)",
        has_ac=True,
        is_sleeper=True,
        total_seats=30,
        amenities="WiFi,Charging Point,Water Bottle,Blanket,Reading Light,GPS Tracking,Snacks",
        is_active=True
    )
    b2 = models.Bus(
        operator_id=op_srs.operator_id,
        bus_number="KA-01-SR-8844",
        bus_name="SRS Royal Volvo Multi-Axle",
        bus_type="Volvo AC Seater (2+2)",
        has_ac=True,
        is_sleeper=False,
        total_seats=40,
        amenities="WiFi,Charging Point,Water Bottle,Reading Light,Emergency Exit,Live Tracking",
        is_active=True
    )
    b3 = models.Bus(
        operator_id=op_orange.operator_id,
        bus_number="AP-09-OR-5511",
        bus_name="Orange Sleeper Gold Class",
        bus_type="Bharat Benz AC Sleeper (2+1)",
        has_ac=True,
        is_sleeper=True,
        total_seats=30,
        amenities="WiFi,Charging Point,Water Bottle,Blanket,Reading Light,Movie Screen,Pillow",
        is_active=True
    )
    b4 = models.Bus(
        operator_id=op_kpn.operator_id,
        bus_number="TN-38-KP-7001",
        bus_name="KPN Express Cruiser",
        bus_type="Non-AC Seater (2+2)",
        has_ac=False,
        is_sleeper=False,
        total_seats=36,
        amenities="Charging Point,Water Bottle,First Aid Box,Emergency Exit",
        is_active=True
    )
    b5 = models.Bus(
        operator_id=op_vrl.operator_id,
        bus_number="KA-25-VR-4400",
        bus_name="VRL I-Shift Multi-Axle Sleeper",
        bus_type="Volvo Multi-Axle AC Sleeper",
        has_ac=True,
        is_sleeper=True,
        total_seats=30,
        amenities="WiFi,Charging Point,Water Bottle,Blanket,Reading Light,GPS Tracking,Emergency Hammer",
        is_active=True
    )

    db.add_all([b1, b2, b3, b4, b5])
    db.commit()

    # 6. Helper to generate seats for bus
    def generate_seats_sleeper(bus_id):
        # 30 sleeper berths: 15 Lower (L1 to L15), 15 Upper (U1 to U15)
        # 5 rows, col 1 (Single berth), col 2 (Aisle), col 3 & 4 (Double berth)
        seats = []
        for deck in ["LOWER", "UPPER"]:
            prefix = "L" if deck == "LOWER" else "U"
            idx = 1
            for r in range(1, 6):
                # Single berth on left (window)
                s_num = f"{prefix}{idx}"
                is_damaged = (bus_id == 1 and s_num == "U15")
                seats.append(models.Seat(
                    bus_id=bus_id,
                    seat_number=s_num,
                    deck=deck,
                    row_num=r,
                    col_num=1,
                    seat_type="SLEEPER",
                    is_ladies=(idx in [1, 4]), # Some ladies seats
                    price_multiplier=1.1 if deck == "LOWER" else 1.0,
                    is_operable=(not is_damaged),
                    inoperable_reason=("Damaged recliner handle" if is_damaged else None)
                ))
                idx += 1
                # Double berth on right
                for c in [3, 4]:
                    s_num = f"{prefix}{idx}"
                    is_damaged = (bus_id == 1 and s_num == "U15")
                    seats.append(models.Seat(
                        bus_id=bus_id,
                        seat_number=s_num,
                        deck=deck,
                        row_num=r,
                        col_num=c,
                        seat_type="SLEEPER",
                        is_ladies=False,
                        price_multiplier=1.05 if deck == "LOWER" else 0.95,
                        is_operable=(not is_damaged),
                        inoperable_reason=("Damaged recliner handle" if is_damaged else None)
                    ))
                    idx += 1

        return seats

    def generate_seats_seater(bus_id, total_rows=10):
        # 2+2 seater layout (10 rows x 4 seats = 40 seats)
        seats = []
        for r in range(1, total_rows + 1):
            cols = [("A", 1), ("B", 2), ("C", 4), ("D", 5)]
            for col_letter, col_num in cols:
                seat_num = f"{r}{col_letter}"
                seats.append(models.Seat(
                    bus_id=bus_id,
                    seat_number=seat_num,
                    deck="LOWER",
                    row_num=r,
                    col_num=col_num,
                    seat_type="SEATER",
                    is_ladies=(r == 1 and col_letter in ["A", "B"]),
                    price_multiplier=1.05 if col_letter in ["A", "D"] else 1.0 # window slightly higher
                ))
        return seats

    all_seats = []
    all_seats.extend(generate_seats_sleeper(b1.bus_id))
    all_seats.extend(generate_seats_seater(b2.bus_id, 10))
    all_seats.extend(generate_seats_sleeper(b3.bus_id))
    all_seats.extend(generate_seats_seater(b4.bus_id, 9))
    all_seats.extend(generate_seats_sleeper(b5.bus_id))
    db.add_all(all_seats)
    db.commit()

    # 7. Trips (Generate trips for today, tomorrow, and subsequent days)
    base_date = datetime.utcnow().date()
    trips = []

    for day_offset in range(0, 5):
        t_date = (base_date + timedelta(days=day_offset)).strftime("%Y-%m-%d")

        # Chennai -> Bangalore trips
        trips.append(models.Trip(bus_id=b1.bus_id, route_id=r_chn_blr.route_id, travel_date=t_date, departure_time="21:30", arrival_time="05:00", fare=950.0))
        trips.append(models.Trip(bus_id=b2.bus_id, route_id=r_chn_blr.route_id, travel_date=t_date, departure_time="06:00", arrival_time="12:30", fare=650.0))
        trips.append(models.Trip(bus_id=b5.bus_id, route_id=r_chn_blr.route_id, travel_date=t_date, departure_time="22:45", arrival_time="06:15", fare=1050.0))

        # Bangalore -> Chennai trips
        trips.append(models.Trip(bus_id=b1.bus_id, route_id=r_blr_chn.route_id, travel_date=t_date, departure_time="14:00", arrival_time="20:30", fare=950.0))
        trips.append(models.Trip(bus_id=b3.bus_id, route_id=r_blr_chn.route_id, travel_date=t_date, departure_time="22:00", arrival_time="04:30", fare=980.0))

        # Mumbai -> Pune trips
        trips.append(models.Trip(bus_id=b2.bus_id, route_id=r_mum_pun.route_id, travel_date=t_date, departure_time="07:30", arrival_time="10:30", fare=450.0))
        trips.append(models.Trip(bus_id=b4.bus_id, route_id=r_mum_pun.route_id, travel_date=t_date, departure_time="18:00", arrival_time="21:00", fare=380.0))

        # Bangalore -> Hyderabad trips
        trips.append(models.Trip(bus_id=b3.bus_id, route_id=r_blr_hyd.route_id, travel_date=t_date, departure_time="21:00", arrival_time="06:00", fare=1200.0))

        # Delhi -> Jaipur trips
        trips.append(models.Trip(bus_id=b4.bus_id, route_id=r_del_jai.route_id, travel_date=t_date, departure_time="06:30", arrival_time="11:30", fare=550.0))

    db.add_all(trips)
    db.commit()

    # 8. Coupons
    c1 = models.Coupon(
        code="BLUEFIRST",
        title="First Booking Offer",
        description="Get 20% instant discount up to ₹200 on your first trip",
        discount_type="PERCENTAGE",
        discount_val=20.0,
        min_booking_amount=500.0,
        max_discount=200.0,
        valid_until=(base_date + timedelta(days=90)).strftime("%Y-%m-%d"),
        usage_limit=1000,
        is_active=True
    )
    c2 = models.Coupon(
        code="SUPERBLUE",
        title="Super Blue Saver",
        description="Flat ₹150 OFF on all bookings above ₹800",
        discount_type="FIXED",
        discount_val=150.0,
        min_booking_amount=800.0,
        max_discount=150.0,
        valid_until=(base_date + timedelta(days=60)).strftime("%Y-%m-%d"),
        usage_limit=500,
        is_active=True
    )
    c3 = models.Coupon(
        code="WEEKEND",
        title="Weekend Getaway",
        description="15% OFF up to ₹250 on weekend journeys",
        discount_type="PERCENTAGE",
        discount_val=15.0,
        min_booking_amount=700.0,
        max_discount=250.0,
        valid_until=(base_date + timedelta(days=45)).strftime("%Y-%m-%d"),
        usage_limit=300,
        is_active=True
    )
    c4 = models.Coupon(
        code="FESTIVE250",
        title="Festive Mega Discount",
        description="Flat ₹250 OFF on premium sleeper bookings above ₹1200",
        discount_type="FIXED",
        discount_val=250.0,
        min_booking_amount=1200.0,
        max_discount=250.0,
        valid_until=(base_date + timedelta(days=30)).strftime("%Y-%m-%d"),
        usage_limit=200,
        is_active=True
    )

    db.add_all([c1, c2, c3, c4])
    db.commit()

    # 9. Verified Reviews
    rev1 = models.Review(
        user_id=u_user.user_id,
        bus_id=b1.bus_id,
        operator_id=op_blue.operator_id,
        rating=5,
        comment="Outstanding journey! The BlueBus sleeper berths are spotless, clean blankets provided, and arrived 10 minutes early at Silk Board."
    )
    rev2 = models.Review(
        user_id=u_priya.user_id,
        bus_id=b1.bus_id,
        operator_id=op_blue.operator_id,
        rating=5,
        comment="Very safe for female solo travelers! Comfortable lower berth, working charging point, and professional staff."
    )
    rev3 = models.Review(
        user_id=u_user.user_id,
        bus_id=b2.bus_id,
        operator_id=op_srs.operator_id,
        rating=4,
        comment="Smooth Volvo ride. Air conditioning was great and driving was very safe. Highly recommended."
    )
    rev4 = models.Review(
        user_id=u_priya.user_id,
        bus_id=b3.bus_id,
        operator_id=op_orange.operator_id,
        rating=5,
        comment="Orange travels live tracking was very accurate. Punctual boarding at Koyambedu."
    )
    db.add_all([rev1, rev2, rev3, rev4])
    db.commit()

    # 10. Sample Seed Booking (Confirmed) so My Bookings & Admin Dashboard have live data!
    t1 = trips[0] # Chennai -> Bangalore on b1
    b1_seats = db.query(models.Seat).filter(models.Seat.bus_id == b1.bus_id).order_by(models.Seat.seat_id).all()
    boarding_pt = db.query(models.RouteStop).filter(models.RouteStop.route_id == r_chn_blr.route_id, models.RouteStop.stop_type == "BOARDING").first()
    dropping_pt = db.query(models.RouteStop).filter(models.RouteStop.route_id == r_chn_blr.route_id, models.RouteStop.stop_type == "DROPPING").first()

    bk1 = models.Booking(
        pnr_number="BB-PNR-772901",
        user_id=u_user.user_id,
        trip_id=t1.trip_id,
        boarding_point_id=boarding_pt.stop_id if boarding_pt else None,
        dropping_point_id=dropping_pt.stop_id if dropping_pt else None,
        booking_date=datetime.utcnow() - timedelta(hours=5),
        total_amount=1900.0,
        discount_amount=200.0,
        final_amount=1700.0,
        coupon_code="BLUEFIRST",
        contact_email="user@bluebus.com",
        contact_phone="+91 98765 43210",
        status="CONFIRMED"
    )
    db.add(bk1)
    db.flush()

    p1 = models.Passenger(
        booking_id=bk1.booking_id,
        seat_id=b1_seats[0].seat_id,
        name="Rahul Sharma",
        age=29,
        gender="MALE",
        seat_number=b1_seats[0].seat_number,
        seat_fare=950.0,
        caption="🪟 Sound sleeper, prefer window berth"
    )
    p2 = models.Passenger(
        booking_id=bk1.booking_id,
        seat_id=b1_seats[1].seat_id,
        name="Sunita Sharma",
        age=27,
        gender="FEMALE",
        seat_number=b1_seats[1].seat_number,
        seat_fare=950.0
    )
    db.add_all([p1, p2])

    pay1 = models.Payment(
        booking_id=bk1.booking_id,
        transaction_id="TXN-BB-994821",
        payment_method="UPI",
        amount=1700.0,
        status="SUCCESS",
        payment_time=datetime.utcnow() - timedelta(hours=5)
    )
    db.add(pay1)

    # 11. Sample Cancelled Booking to show Cancellation & Refund in Admin/User
    bk2 = models.Booking(
        pnr_number="BB-PNR-661044",
        user_id=u_user.user_id,
        trip_id=t1.trip_id,
        boarding_point_id=boarding_pt.stop_id if boarding_pt else None,
        dropping_point_id=dropping_pt.stop_id if dropping_pt else None,
        booking_date=datetime.utcnow() - timedelta(days=2),
        total_amount=950.0,
        discount_amount=0.0,
        final_amount=950.0,
        coupon_code=None,
        contact_email="user@bluebus.com",
        contact_phone="+91 98765 43210",
        status="CANCELLED"
    )
    db.add(bk2)
    db.flush()

    p3 = models.Passenger(
        booking_id=bk2.booking_id,
        seat_id=b1_seats[2].seat_id,
        name="Vikram Verma",
        age=32,
        gender="MALE",
        seat_number=b1_seats[2].seat_number,
        seat_fare=950.0
    )
    db.add(p3)

    canc1 = models.Cancellation(
        booking_id=bk2.booking_id,
        cancelled_at=datetime.utcnow() - timedelta(days=1),
        cancellation_reason="Plans changed due to emergency",
        refund_amount=855.0, # 90%
        cancellation_fee=95.0, # 10%
        refund_transaction_id="REF-BB-382910",
        refund_status="REFUNDED"
    )
    db.add(canc1)

    # 12. Sample Confirmed Booking for Priya Sharma on same trip (Seat L4)
    bk3 = models.Booking(
        pnr_number="BB-PNR-883192",
        user_id=u_priya.user_id,
        trip_id=t1.trip_id,
        boarding_point_id=boarding_pt.stop_id if boarding_pt else None,
        dropping_point_id=dropping_pt.stop_id if dropping_pt else None,
        booking_date=datetime.utcnow() - timedelta(hours=3),
        total_amount=950.0,
        discount_amount=0.0,
        final_amount=950.0,
        coupon_code=None,
        contact_email="priya.sharma@example.com",
        contact_phone="+91 94441 22334",
        status="CONFIRMED"
    )
    db.add(bk3)
    db.flush()

    p_priya = models.Passenger(
        booking_id=bk3.booking_id,
        seat_id=b1_seats[3].seat_id,
        name="Priya Sharma",
        age=27,
        gender="FEMALE",
        seat_number=b1_seats[3].seat_number,
        seat_fare=950.0,
        caption="👶 Carrying a baby, prefer lower berth"
    )
    db.add(p_priya)

    pay3 = models.Payment(
        booking_id=bk3.booking_id,
        transaction_id="TXN-BB-771239",
        payment_method="NET_BANKING",
        amount=950.0,
        status="SUCCESS",
        payment_time=datetime.utcnow() - timedelta(hours=3)
    )
    db.add(pay3)
    db.flush()

    # 13. Sample Pending Peer-to-Peer Seat Swap Request (Rahul -> Priya)
    swap_req_seed = models.SeatSwapRequest(
        trip_id=t1.trip_id,
        requester_booking_id=bk1.booking_id,
        requester_passenger_id=p1.passenger_id,
        requester_user_id=u_user.user_id,
        requester_seat_id=p1.seat_id,
        requester_seat_number=p1.seat_number,
        target_booking_id=bk3.booking_id,
        target_passenger_id=p_priya.passenger_id,
        target_user_id=u_priya.user_id,
        target_seat_id=p_priya.seat_id,
        target_seat_number=p_priya.seat_number,
        status="PENDING",
        reason="Traveling with family on lower berth, would love to sit next to Seat L2!"
    )
    db.add(swap_req_seed)

    db.commit()
    print("[Blue Bus] Seed complete! Demo accounts ready: user@bluebus.com / admin@bluebus.com")

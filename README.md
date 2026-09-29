# 🚌 Blue Bus — Full-Featured Bus Reservation Platform (RedBus Clone)

A modern, production-grade bus reservation platform modeled after **RedBus**, branded as **Blue Bus** (with a signature royal blue and navy theme `#1d4ed8` / `#2563eb`).

---

## 🌐 Live Website on GitHub Pages
> **Live Site URL**: **`https://Dan-droid-A-113.github.io/Bluebus/`**
>
> Blue Bus includes an intelligent **hybrid engine**:
> - **Standalone Cloud / GitHub Pages Mode**: Runs instantly in any web browser without needing any backend installation, utilizing an interactive client-side engine with persistent `localStorage` for bookings, ticket printing, and seat swapping!
> - **Full-Stack Mode**: Seamlessly connects to the FastAPI backend at `http://localhost:8080/api` or any cloud-hosted API (`VITE_API_URL`).

### ⚙️ How to Enable GitHub Pages (1-Minute Setup)
1. On GitHub, navigate to your repository: **`Dan-droid-A-113/Bluebus`**
2. Click on **Settings** (top navigation bar) &rarr; **Pages** (left sidebar).
3. Under **Build and deployment** &rarr; **Source**:
   - **Method A (Automated GitHub Actions)**: Select **`GitHub Actions`**. The workflow `.github/workflows/deploy.yml` will automatically build and deploy the site on every push!
   - **Method B (Instant `/docs` Folder)**: Select **`Deploy from a branch`**, pick branch **`master`** and folder **`/docs`**, then click **Save**.
4. Within 60 seconds, your live website will be accessible at:  
   👉 **`https://Dan-droid-A-113.github.io/Bluebus/`**

---

## 🌟 Core Features Implemented

| # | Feature | Implementation Details |
|---|---|---|
| **1** | 👤 **User Registration & Login** | JWT token authentication, bcrypt hashing, profile view & update, passenger/admin roles. Pre-configured demo accounts. |
| **2** | 🔎 **Bus Search & City Dropdown** | Search across major Indian cities (Bangalore, Chennai, Hyderabad, Mumbai, Pune, Delhi, etc.), bus types (AC/Non-AC/Sleeper/Seater), price slider, and operator filter. |
| **3** | 🚌 **Bus & Operator Management** | Bus registration number, operator details, bus type, total capacity, and amenities (WiFi, Charging, Blankets, GPS, Water). |
| **4** | 🛣️ **Route Management** | Source, destination, total distance in km, intermediate stops, and estimated travel time in minutes. |
| **5** | 🕐 **Trip/Schedule Management** | Schedule buses for dates, departure and arrival times, and base fares per seat/berth. |
| **6** | 💺 **Interactive Seat Layout & Safety** | RedBus-style Lower & Upper deck seat maps, driver cabin indicator, entrance door, safety notice, and female/male occupied seat badges. |
| **7** | 🏷️ **Passenger Travel Captions** | Passengers can add custom travel notes (e.g. *Carrying a baby*, *In a wheelchair*, *Sound sleeper*, *No swaps*, *Window swap only*). Hovering over any booked seat displays these captions on the **Live Insight Bar**! |
| **8** | 🔄 **Peer-to-Peer Seat Swapping** | Swap seats with empty berths instantly, or send an exchange request to a fellow passenger with custom notes. Fellow passengers can Accept or Decline from their bookings console! |
| **9** | 🛠️ **Inoperable / Damaged Seats** | Admins can flag seats as damaged / under maintenance (marked with wrench icons and unavailable for booking). |
| **10** | 🎟️ **Ticket Booking & Checkout** | Multi-passenger seat selection, boarding/dropping stop selector, coupon code applicator, and checkout flow. |
| **11** | 💳 **Payment Processing** | Multi-method sandbox gateway (UPI / QR Code scanner simulation, Credit/Debit cards, Net Banking) with transaction ID & status recording. |
| **12** | 🎫 **Downloadable / Printable E-Ticket** | Official Blue Bus E-Ticket with dynamic QR code, PNR number, passenger travel notes, boarding details, and fare breakdown. |
| **13** | ❌ **Cancellation & Tiered Refunds** | Tiered refund calculation (>24 hrs: 90% refund, 12-24 hrs: 75%, <12 hrs: 50%), instant cancellation execution and refund transaction record. |
| **14** | ⭐ **Ratings & Reviews** | Verified travelers submit 1-5 star ratings and reviews for buses & operators; live rating average recalculation. |
| **15** | 🎁 **Coupons & Offers** | Promotional codes (`BLUEFIRST`, `FLAT100`), percentage/flat discounts, usage limit tracking, and instant live coupon validation. |
| **16** | 📊 **Admin Dashboard & Reports** | Executive metrics: Total Revenue, Total Bookings, Occupancy Rate %, Cancellations ledger, Bus Fleet & damaged seat management. |

---

## 👥 Demo User Personas for Testing

| Persona Name | Email | Password | Role | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Rahul Sharma** | `user@bluebus.com` | `Password123!` | `PASSENGER` | Book tickets, view e-tickets, cancel tickets, apply coupons, submit reviews. |
| **Blue Bus Admin** | `admin@bluebus.com` | `Admin123!` | `ADMIN` | Full access to Analytics Dashboard, fleet management, scheduling, coupons. |

---

## 🚀 Quick Start (Running Locally)

### Option A: 1-Click Launch (Windows)
Double-click:
```powershell
start_bluebus.bat
```

### Option B: Manual Terminal Launch

#### 1. Start the FastAPI Backend
```powershell
cd "bluebus"
python run_backend.py
```
- API Docs & Swagger UI: [http://localhost:8080/docs](http://localhost:8080/docs)

#### 2. Start the React Vite Frontend
```powershell
cd "bluebus/frontend"
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

### Option C: Run Automated Pytest Suite
```powershell
cd "bluebus"
python -m pytest backend/tests/test_bluebus.py -v
```

---

## 🏛️ Directory Structure

```
bluebus/
├── backend/
│   ├── app/
│   │   ├── config.py             # Config, JWT keys, SQLite DB path
│   │   ├── database.py           # SQLAlchemy database session
│   │   ├── models.py             # 13 relational models
│   │   ├── schemas.py            # Pydantic schemas
│   │   ├── security.py           # JWT & password hashing
│   │   ├── seed_data.py          # Indian routes, buses, operators, coupons, reviews
│   │   ├── main.py               # FastAPI application entrypoint
│   │   └── routers/
│   │       ├── auth.py           # Register, login, profile
│   │       ├── buses.py          # Search & bus management
│   │       ├── routes.py         # Routes & stops
│   │       ├── trips.py          # Trip scheduling & seat layout
│   │       ├── bookings.py       # Ticket reservation & PNR
│   │       ├── payments.py       # Gateway simulation & txn IDs
│   │       ├── cancellations.py  # Refund policy & cancel flow
│   │       ├── reviews.py        # Rating & review submission
│   │       ├── coupons.py        # Promo code engine
│   │       └── admin.py          # Analytics KPIs & manifest
│   ├── tests/
│   │   └── test_bluebus.py       # 9 comprehensive tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api.js                # Frontend API client
│   │   ├── App.jsx               # Navigation & app shell
│   │   ├── App.css               # RedBus-style blue theme
│   │   ├── index.css             # Base styles & variables
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Top navigation
│   │   │   ├── HeroSearch.jsx    # Source/destination/date search card
│   │   │   ├── FilterSidebar.jsx # Filters (Bus type, price, departure)
│   │   │   ├── BusCard.jsx       # Bus summary card
│   │   │   ├── SeatLayout.jsx    # Interactive Lower/Upper deck map
│   │   │   ├── PaymentModal.jsx  # UPI/Card/NetBanking checkout
│   │   │   ├── TicketModal.jsx   # Printable E-Ticket with QR code
│   │   │   ├── CancelModal.jsx   # Refund breakdown & cancellation
│   │   │   ├── ReviewModal.jsx   # Rate trip & review list
│   │   │   └── AuthModal.jsx     # Login/register with 1-click demo
│   │   └── pages/
│   │       ├── SearchPage.jsx    # Main search & booking flow
│   │       ├── MyBookingsPage.jsx# User bookings & PNR lookup
│   │       ├── OffersPage.jsx    # Visual promo cards with copy code
│   │       └── AdminDashboardPage.jsx # KPIs, charts & operations
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── run_backend.py
├── start_bluebus.bat
└── README.md
```

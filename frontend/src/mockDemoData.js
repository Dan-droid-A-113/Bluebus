// Blue Bus Standalone Demo Engine & Persistent LocalStorage Provider
// Automatically activates when hosted on GitHub Pages or when backend is unreachable.

const STORAGE_KEYS = {
  BOOKINGS: 'bluebus_demo_bookings',
  SWAPS: 'bluebus_demo_swaps',
  BUSES: 'bluebus_demo_buses',
  REVIEWS: 'bluebus_demo_reviews'
};

export const DEMO_CITIES = [
  'Bangalore',
  'Chennai',
  'Hyderabad',
  'Mumbai',
  'Pune',
  'Delhi',
  'Goa',
  'Coimbatore',
  'Madurai',
  'Kochi',
  'Mysore',
  'Vijayawada',
  'Tirupati',
  'Pondicherry'
];

export const INITIAL_BUSES = [
  {
    bus_id: 1,
    bus_number: 'KA-01-BB-1001',
    bus_name: 'Royal Multi-Axle AC Sleeper (2+1)',
    bus_type: 'AC_SLEEPER',
    operator_name: 'IntrCity SmartBus',
    operator_id: 1,
    total_capacity: 30,
    amenities: 'WiFi, Charging Port, Blankets, Water Bottle, Reading Lamp, Live Tracking',
    is_sleeper: true,
    rating: 4.8,
    reviews_count: 342,
    base_fare: 899
  },
  {
    bus_id: 2,
    bus_number: 'TN-09-BB-2002',
    bus_name: 'Airavat Club Class Multi-Axle Volvo',
    bus_type: 'AC_SEATER',
    operator_name: 'SRS Travels',
    operator_id: 2,
    total_capacity: 40,
    amenities: 'Push-back Seats, AC, Charging Point, Bottle Holder, Reading Light',
    is_sleeper: false,
    rating: 4.6,
    reviews_count: 218,
    base_fare: 649
  },
  {
    bus_id: 3,
    bus_number: 'AP-03-BB-3003',
    bus_name: 'Super Luxury Sleeper & Seater',
    bus_type: 'NON_AC_SLEEPER',
    operator_name: 'Orange Travels',
    operator_id: 3,
    total_capacity: 30,
    amenities: 'Spacious Berths, Charging Ports, Pillow, Emergency Exit',
    is_sleeper: true,
    rating: 4.5,
    reviews_count: 175,
    base_fare: 750
  },
  {
    bus_id: 4,
    bus_number: 'KA-05-BB-4004',
    bus_name: 'Executive Express Seater 2+2',
    bus_type: 'NON_AC_SEATER',
    operator_name: 'Greenline Travels',
    operator_id: 4,
    total_capacity: 44,
    amenities: 'Ergonomic Seats, Music System, First Aid Kit, Tool Kit',
    is_sleeper: false,
    rating: 4.3,
    reviews_count: 120,
    base_fare: 499
  }
];

export const INITIAL_BOOKING = {
  booking_id: 991,
  pnr_number: 'BB-PNR-772901',
  user_id: 1,
  user_name: 'Rahul Sharma',
  bus_id: 1,
  bus_name: 'Royal Multi-Axle AC Sleeper (2+1)',
  bus_type: 'AC_SLEEPER',
  operator_name: 'IntrCity SmartBus',
  trip_id: 1,
  source_city: 'Bangalore',
  destination_city: 'Chennai',
  travel_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  departure_time: '21:30',
  arrival_time: '05:30',
  boarding_point: 'Madiwala (Near Total Mall Water Tank)',
  dropping_point: 'Koyambedu (Omni Bus Stand Platform 4)',
  total_amount: 899.0,
  discount_amount: 0.0,
  final_amount: 899.0,
  coupon_code: null,
  status: 'CONFIRMED',
  contact_email: 'user@bluebus.com',
  contact_phone: '9876543210',
  booking_date: new Date().toISOString(),
  payment: {
    transaction_id: 'TXN-BB-DEMO-991',
    payment_method: 'UPI',
    amount: 899.0,
    payment_status: 'SUCCESS',
    payment_time: new Date().toISOString()
  },
  passengers: [
    {
      passenger_id: 101,
      name: 'Rahul Sharma',
      age: 29,
      gender: 'MALE',
      seat_id: 1,
      seat_number: 'L1',
      seat_fare: 899.0,
      caption: '🪟 Sound sleeper, prefer window berth'
    }
  ]
};

export const INITIAL_SWAP_REQUEST = {
  request_id: 401,
  trip_id: 1,
  source_city: 'Bangalore',
  destination_city: 'Chennai',
  travel_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
  departure_time: '21:30',
  bus_name: 'Royal Multi-Axle AC Sleeper (2+1)',
  requester_user_id: 2,
  requester_user_name: 'Vikram Malhotra',
  requester_passenger_name: 'Vikram Malhotra',
  requester_seat_number: 'L8',
  requester_caption: '👨‍💼 Traveling for conference, quiet traveler',
  target_user_id: 1,
  target_user_name: 'Rahul Sharma',
  target_passenger_name: 'Rahul Sharma',
  target_seat_number: 'L1',
  target_caption: '🪟 Sound sleeper, prefer window berth',
  status: 'PENDING',
  reason: 'Traveling alongside my colleague in L7, would deeply appreciate swapping for L1!',
  created_at: 'Just now'
};

// --- Storage Helpers ---
function getStored(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }
}

// Generate Seat Grid
export function generateDemoSeats(tripId = 1) {
  const isSleeper = tripId % 2 !== 0;
  const lowerSeats = [];
  const upperSeats = [];

  const occupiedMap = {
    'L2': { gender: 'FEMALE', age: 27, caption: '👶 Carrying a baby, prefer lower berth', ladies: true },
    'L3': { gender: 'FEMALE', age: 31, caption: '♿ In a wheelchair, needs mobility help', ladies: true },
    'L4': { gender: 'FEMALE', age: 27, caption: '👶 Carrying a baby, prefer lower berth', ladies: true },
    'L5': { gender: 'MALE', age: 34, caption: '😴 Sound sleeper', ladies: false },
    'L7': { gender: 'MALE', age: 28, caption: '🎧 Quiet traveler', ladies: false },
    'L8': { gender: 'MALE', age: 32, caption: '👨‍💼 Traveling for conference', ladies: false },
    'U2': { gender: 'MALE', age: 25, caption: '🪟 Window seat swap preferred', ladies: false },
    'U5': { gender: 'FEMALE', age: 24, caption: '🚫 Not interested in seat swaps', ladies: true }
  };

  const inoperableMap = {
    'L11': 'Damaged / Recliner Mechanism Broken'
  };

  // Add stored booked seats from demo bookings
  const userBookings = getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
  userBookings.forEach(b => {
    if (b.status === 'CONFIRMED') {
      b.passengers?.forEach(p => {
        occupiedMap[p.seat_number] = {
          gender: p.gender || 'MALE',
          age: p.age || 28,
          caption: p.caption || '',
          ladies: p.gender === 'FEMALE',
          isUserBooking: true
        };
      });
    }
  });

  if (isSleeper) {
    for (let r = 1; r <= 5; r++) {
      for (let c = 1; c <= 3; c++) {
        const lowerNum = `L${(r - 1) * 3 + c}`;
        const upperNum = `U${(r - 1) * 3 + c}`;

        const lowerOcc = occupiedMap[lowerNum];
        const lowerInop = inoperableMap[lowerNum];
        lowerSeats.push({
          seat_id: (r - 1) * 3 + c,
          seat_number: lowerNum,
          deck: 'LOWER',
          row_num: r,
          col_num: c,
          seat_type: 'SLEEPER',
          berth_type: c === 1 ? 'Single Berth (Window)' : 'Double Berth',
          price: 899.0,
          status: lowerInop ? 'INOPERABLE' : lowerOcc ? (lowerOcc.ladies ? 'LADIES_BOOKED' : 'BOOKED') : 'AVAILABLE',
          is_operable: !lowerInop,
          inoperable_reason: lowerInop || null,
          passenger_gender: lowerOcc ? lowerOcc.gender : null,
          passenger_age: lowerOcc ? lowerOcc.age : null,
          passenger_caption: lowerOcc ? lowerOcc.caption : null
        });

        const upperOcc = occupiedMap[upperNum];
        const upperInop = inoperableMap[upperNum];
        upperSeats.push({
          seat_id: 15 + (r - 1) * 3 + c,
          seat_number: upperNum,
          deck: 'UPPER',
          row_num: r,
          col_num: c,
          seat_type: 'SLEEPER',
          berth_type: c === 1 ? 'Upper Single Berth' : 'Upper Double Berth',
          price: 949.0,
          status: upperInop ? 'INOPERABLE' : upperOcc ? (upperOcc.ladies ? 'LADIES_BOOKED' : 'BOOKED') : 'AVAILABLE',
          is_operable: !upperInop,
          inoperable_reason: upperInop || null,
          passenger_gender: upperOcc ? upperOcc.gender : null,
          passenger_age: upperOcc ? upperOcc.age : null,
          passenger_caption: upperOcc ? upperOcc.caption : null
        });
      }
    }
  } else {
    // Seater layout (2+2)
    for (let r = 1; r <= 8; r++) {
      for (let c = 1; c <= 4; c++) {
        const seatNum = `S${(r - 1) * 4 + c}`;
        const occ = occupiedMap[seatNum];
        const inop = inoperableMap[seatNum];
        lowerSeats.push({
          seat_id: (r - 1) * 4 + c,
          seat_number: seatNum,
          deck: 'LOWER',
          row_num: r,
          col_num: c,
          seat_type: 'SEATER',
          berth_type: (c === 1 || c === 4) ? 'Window Seat' : 'Aisle Seat',
          price: 649.0,
          status: inop ? 'INOPERABLE' : occ ? (occ.ladies ? 'LADIES_BOOKED' : 'BOOKED') : 'AVAILABLE',
          is_operable: !inop,
          inoperable_reason: inop || null,
          passenger_gender: occ ? occ.gender : null,
          passenger_age: occ ? occ.age : null,
          passenger_caption: occ ? occ.caption : null
        });
      }
    }
  }

  return {
    trip_id: tripId,
    bus_name: isSleeper ? 'Royal Multi-Axle AC Sleeper (2+1)' : 'Airavat Club Class Multi-Axle Volvo',
    is_sleeper: isSleeper,
    lower_deck: lowerSeats,
    upper_deck: upperSeats,
    boarding_points: [
      { stop_id: 1, stop_name: 'Madiwala', landmark: 'Near Total Mall / Police Station', stop_time: '21:30' },
      { stop_id: 2, stop_name: 'Electronic City', landmark: 'Toll Plaza Flyover Entry', stop_time: '22:00' },
      { stop_id: 3, stop_name: 'Majestic', landmark: 'Platform 19 Anand Rao Circle', stop_time: '20:45' }
    ],
    dropping_points: [
      { stop_id: 4, stop_name: 'Koyambedu', landmark: 'Omni Bus Stand Platform 4', stop_time: '05:30' },
      { stop_id: 5, stop_name: 'Guindy', landmark: 'Metro Station Exit B', stop_time: '06:00' },
      { stop_id: 6, stop_name: 'Tambaram', landmark: 'Sanatorium Bus Stop', stop_time: '06:20' }
    ]
  };
}

// Generate Trips for Search
export function generateDemoTrips(params = {}) {
  const source = params.source || 'Bangalore';
  const destination = params.destination || 'Chennai';
  const date = params.date || new Date().toISOString().split('T')[0];

  const trips = [
    {
      trip_id: 1,
      source_city: source,
      destination_city: destination,
      travel_date: date,
      departure_time: '21:30',
      arrival_time: '05:30',
      duration_hours: '8h 00m',
      bus_id: 1,
      bus_name: 'Royal Multi-Axle AC Sleeper (2+1)',
      bus_type: 'AC_SLEEPER',
      bus_number: 'KA-01-BB-1001',
      operator_name: 'IntrCity SmartBus',
      rating: 4.8,
      reviews_count: 342,
      base_fare: 899.0,
      min_fare: 899.0,
      available_seats: 19,
      amenities: 'WiFi, Charging Port, Blankets, Water Bottle, Reading Lamp, Live Tracking',
      is_sleeper: true,
      has_inoperable_seats: true,
      boarding_points: ['Madiwala (21:30)', 'Majestic (20:45)', 'Electronic City (22:00)'],
      dropping_points: ['Koyambedu (05:30)', 'Guindy (06:00)', 'Tambaram (06:20)']
    },
    {
      trip_id: 2,
      source_city: source,
      destination_city: destination,
      travel_date: date,
      departure_time: '22:15',
      arrival_time: '06:00',
      duration_hours: '7h 45m',
      bus_id: 2,
      bus_name: 'Airavat Club Class Multi-Axle Volvo',
      bus_type: 'AC_SEATER',
      bus_number: 'TN-09-BB-2002',
      operator_name: 'SRS Travels',
      rating: 4.6,
      reviews_count: 218,
      base_fare: 649.0,
      min_fare: 649.0,
      available_seats: 26,
      amenities: 'Push-back Seats, AC, Charging Point, Bottle Holder, Reading Light',
      is_sleeper: false,
      has_inoperable_seats: false,
      boarding_points: ['Majestic (21:30)', 'Shantinagar (22:00)', 'Hosur (23:15)'],
      dropping_points: ['Koyambedu (06:00)', 'Central (06:30)']
    },
    {
      trip_id: 3,
      source_city: source,
      destination_city: destination,
      travel_date: date,
      departure_time: '23:00',
      arrival_time: '07:15',
      duration_hours: '8h 15m',
      bus_id: 3,
      bus_name: 'Super Luxury Sleeper & Seater',
      bus_type: 'NON_AC_SLEEPER',
      bus_number: 'AP-03-BB-3003',
      operator_name: 'Orange Travels',
      rating: 4.5,
      reviews_count: 175,
      base_fare: 750.0,
      min_fare: 750.0,
      available_seats: 14,
      amenities: 'Spacious Berths, Charging Ports, Pillow, Emergency Exit',
      is_sleeper: true,
      has_inoperable_seats: false,
      boarding_points: ['Silk Board (22:45)', 'BTM Layout (23:00)'],
      dropping_points: ['Perungalathur (06:45)', 'Koyambedu (07:15)']
    },
    {
      trip_id: 4,
      source_city: source,
      destination_city: destination,
      travel_date: date,
      departure_time: '06:00',
      arrival_time: '12:30',
      duration_hours: '6h 30m',
      bus_id: 4,
      bus_name: 'Day Express Executive Seater',
      bus_type: 'NON_AC_SEATER',
      bus_number: 'KA-05-BB-4004',
      operator_name: 'Greenline Travels',
      rating: 4.3,
      reviews_count: 120,
      base_fare: 499.0,
      min_fare: 499.0,
      available_seats: 31,
      amenities: 'Ergonomic Seats, Music System, First Aid Kit',
      is_sleeper: false,
      has_inoperable_seats: false,
      boarding_points: ['Majestic (06:00)', 'Indiranagar (06:30)'],
      dropping_points: ['Koyambedu (12:30)']
    }
  ];

  // Filtering
  return trips.filter(t => {
    if (params.bus_type && !t.bus_type.includes(params.bus_type)) return false;
    if (params.operator_name && !t.operator_name.toLowerCase().includes(params.operator_name.toLowerCase())) return false;
    if (params.max_price && t.min_fare > Number(params.max_price)) return false;
    return true;
  });
}

// Full Mock API Handler
export async function handleMockApi(endpoint, options = {}) {
  // Simulate natural network roundtrip
  await new Promise(r => setTimeout(r, 120));

  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // Cities
  if (endpoint.startsWith('/routes/cities')) {
    return DEMO_CITIES;
  }

  // Search Buses
  if (endpoint.startsWith('/buses/search')) {
    const url = new URL('http://localhost' + endpoint);
    const params = Object.fromEntries(url.searchParams.entries());
    return generateDemoTrips(params);
  }

  // Seats for Trip
  if (endpoint.match(/^\/trips\/\d+\/seats/)) {
    const tripId = Number(endpoint.split('/')[2]) || 1;
    return generateDemoSeats(tripId);
  }

  // Coupons
  if (endpoint.startsWith('/coupons/apply')) {
    const code = (body.code || '').toUpperCase();
    const total = Number(body.total_amount) || 0;
    if (code === 'BLUEFIRST') {
      const discount = Math.round(total * 0.15 * 100) / 100;
      return { valid: true, code, discount_amount: discount, final_amount: total - discount, message: '🎉 15% Welcome Discount Applied!' };
    }
    if (code === 'FLAT100') {
      const discount = Math.min(100, total);
      return { valid: true, code, discount_amount: discount, final_amount: total - discount, message: '🎉 Flat ₹100 Off Applied!' };
    }
    return { valid: false, message: 'Invalid or expired coupon code.' };
  }

  if (endpoint.startsWith('/coupons')) {
    return [
      { coupon_id: 1, code: 'BLUEFIRST', discount_type: 'PERCENTAGE', discount_value: 15, max_discount: 250, min_booking_amount: 500, description: '15% off for all passengers' },
      { coupon_id: 2, code: 'FLAT100', discount_type: 'FLAT', discount_value: 100, max_discount: 100, min_booking_amount: 600, description: 'Flat ₹100 instant discount' }
    ];
  }

  // Create Booking
  if (endpoint === '/bookings' && method === 'POST') {
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
    const pnr = `BB-PNR-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBooking = {
      booking_id: Date.now(),
      pnr_number: pnr,
      user_id: 1,
      user_name: body.passengers?.[0]?.name || 'Rahul Sharma',
      bus_id: 1,
      bus_name: 'Royal Multi-Axle AC Sleeper (2+1)',
      bus_type: 'AC_SLEEPER',
      operator_name: 'IntrCity SmartBus',
      trip_id: body.trip_id || 1,
      source_city: 'Bangalore',
      destination_city: 'Chennai',
      travel_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      departure_time: '21:30',
      arrival_time: '05:30',
      boarding_point: 'Madiwala (Near Total Mall)',
      dropping_point: 'Koyambedu (Omni Bus Stand Platform 4)',
      total_amount: body.total_amount || 899.0,
      discount_amount: body.discount_amount || 0.0,
      final_amount: body.final_amount || 899.0,
      coupon_code: body.coupon_code || null,
      status: 'CONFIRMED',
      contact_email: body.contact_email || 'user@bluebus.com',
      contact_phone: body.contact_phone || '9876543210',
      booking_date: new Date().toISOString(),
      payment: {
        transaction_id: `TXN-${pnr}`,
        payment_method: body.payment_method || 'UPI',
        amount: body.final_amount || 899.0,
        payment_status: 'SUCCESS',
        payment_time: new Date().toISOString()
      },
      passengers: (body.passengers || []).map((p, idx) => ({
        passenger_id: Date.now() + idx,
        name: p.name,
        age: p.age,
        gender: p.gender,
        seat_id: p.seat_id,
        seat_number: `L${idx + 4}`,
        seat_fare: (body.final_amount || 899.0) / (body.passengers.length || 1),
        caption: p.caption || null
      }))
    };

    bookings.unshift(newBooking);
    setStored(STORAGE_KEYS.BOOKINGS, bookings);
    return newBooking;
  }

  // Get My Bookings
  if (endpoint === '/bookings/my') {
    return getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
  }

  // PNR Lookup
  if (endpoint.startsWith('/bookings/pnr/')) {
    const pnr = endpoint.split('/')[3];
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
    const found = bookings.find(b => b.pnr_number.toUpperCase() === pnr.toUpperCase());
    if (found) return found;
    throw new Error(`Booking with PNR ${pnr} not found.`);
  }

  // Cancellation Preview
  if (endpoint.startsWith('/cancellations/preview/')) {
    const pnr = endpoint.split('/')[3];
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
    const found = bookings.find(b => b.pnr_number.toUpperCase() === pnr.toUpperCase());
    const fare = found ? found.final_amount : 899.0;
    return {
      pnr_number: pnr,
      total_fare: fare,
      cancellation_charge_percentage: 20.0,
      cancellation_charge_amount: Math.round(fare * 0.2 * 100) / 100,
      refund_amount: Math.round(fare * 0.8 * 100) / 100,
      hours_before_departure: 36
    };
  }

  // Confirm Cancellation
  if (endpoint.startsWith('/cancellations/') && method === 'POST') {
    const pnr = endpoint.split('/')[2];
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
    const idx = bookings.findIndex(b => b.pnr_number.toUpperCase() === pnr.toUpperCase());
    if (idx !== -1) {
      bookings[idx].status = 'CANCELLED';
      setStored(STORAGE_KEYS.BOOKINGS, bookings);
    }
    return {
      pnr_number: pnr,
      refund_transaction_id: `REF-${pnr}`,
      refund_amount: 719.20,
      message: 'Booking cancelled successfully. Refund initiated to original payment source.'
    };
  }

  // Instant Seat Swap
  if (endpoint.includes('/swap-seat') && method === 'POST') {
    const parts = endpoint.split('/');
    const pnr = parts[2];
    const bookings = getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
    const b = bookings.find(x => x.pnr_number.toUpperCase() === pnr.toUpperCase());
    if (b && b.passengers?.length > 0) {
      b.passengers[0].seat_number = 'L9';
      setStored(STORAGE_KEYS.BOOKINGS, bookings);
    }
    return { message: 'Seat instantly swapped to chosen available berth!' };
  }

  // Peer-to-Peer Swap Request
  if (endpoint.includes('/request-swap') && method === 'POST') {
    const swaps = getStored(STORAGE_KEYS.SWAPS, [INITIAL_SWAP_REQUEST]);
    const newReq = {
      request_id: Date.now(),
      trip_id: 1,
      source_city: 'Bangalore',
      destination_city: 'Chennai',
      travel_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      departure_time: '21:30',
      bus_name: 'Royal Multi-Axle AC Sleeper (2+1)',
      requester_user_id: 1,
      requester_user_name: 'Rahul Sharma',
      requester_passenger_name: 'Rahul Sharma',
      requester_seat_number: 'L1',
      requester_caption: '🪟 Sound sleeper, prefer window berth',
      target_user_id: 2,
      target_user_name: 'Occupant',
      target_passenger_name: 'Fellow Passenger',
      target_seat_number: 'L3',
      target_caption: '♿ In a wheelchair, needs mobility help',
      status: 'PENDING',
      reason: body.reason || 'Preference for this seat',
      created_at: 'Just now'
    };
    swaps.unshift(newReq);
    setStored(STORAGE_KEYS.SWAPS, swaps);
    return { message: 'Swap request submitted to passenger!', request_id: newReq.request_id };
  }

  // Incoming Swaps
  if (endpoint === '/bookings/swap-requests/incoming') {
    const swaps = getStored(STORAGE_KEYS.SWAPS, [INITIAL_SWAP_REQUEST]);
    return swaps.filter(s => s.target_user_id === 1);
  }

  // Outgoing Swaps
  if (endpoint === '/bookings/swap-requests/outgoing') {
    const swaps = getStored(STORAGE_KEYS.SWAPS, [INITIAL_SWAP_REQUEST]);
    return swaps.filter(s => s.requester_user_id === 1);
  }

  // Respond to Swap (Accept / Reject)
  if (endpoint.includes('/swap-requests/') && endpoint.endsWith('/respond')) {
    const requestId = Number(endpoint.split('/')[3]);
    const action = body.action;
    const swaps = getStored(STORAGE_KEYS.SWAPS, [INITIAL_SWAP_REQUEST]);
    const found = swaps.find(s => s.request_id === requestId);
    if (found) {
      found.status = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
      setStored(STORAGE_KEYS.SWAPS, swaps);
    }
    return { message: `Swap request ${action === 'ACCEPT' ? 'accepted' : 'rejected'} successfully!` };
  }

  // Cancel Swap
  if (endpoint.includes('/swap-requests/') && endpoint.endsWith('/cancel')) {
    const requestId = Number(endpoint.split('/')[3]);
    const swaps = getStored(STORAGE_KEYS.SWAPS, [INITIAL_SWAP_REQUEST]);
    const filtered = swaps.filter(s => s.request_id !== requestId);
    setStored(STORAGE_KEYS.SWAPS, filtered);
    return { message: 'Swap request cancelled.' };
  }

  // Auth: Login
  if (endpoint === '/auth/login' && method === 'POST') {
    const email = (body.email || '').toLowerCase();
    const isAdmin = email.includes('admin');
    return {
      access_token: 'demo-jwt-token-' + Date.now(),
      token_type: 'bearer',
      user_id: isAdmin ? 99 : 1,
      email: body.email,
      full_name: isAdmin ? 'Blue Bus Administrator' : 'Rahul Sharma',
      phone: '9876543210',
      role: isAdmin ? 'ADMIN' : 'USER',
      gender: 'MALE',
      age: 29
    };
  }

  // Auth: Register
  if (endpoint === '/auth/register' && method === 'POST') {
    return {
      message: 'Account registered successfully! You can now log in.',
      email: body.email
    };
  }

  // Auth: Me
  if (endpoint === '/auth/me') {
    return {
      user_id: 1,
      email: 'user@bluebus.com',
      full_name: 'Rahul Sharma',
      phone: '9876543210',
      role: 'USER',
      gender: 'MALE',
      age: 29
    };
  }

  // Reviews
  if (endpoint.startsWith('/reviews') && method === 'GET') {
    return getStored(STORAGE_KEYS.REVIEWS, [
      { review_id: 1, user_name: 'Sneha Rao', rating: 5, comment: 'Extremely clean berths, on-time departure from Madiwala, and courteous staff!', created_at: '2 days ago' },
      { review_id: 2, user_name: 'Karthik V', rating: 4, comment: 'Very smooth ride and good AC cooling. Arrived at Koyambedu 15 mins early.', created_at: '4 days ago' }
    ]);
  }

  if (endpoint === '/reviews' && method === 'POST') {
    const reviews = getStored(STORAGE_KEYS.REVIEWS, []);
    const newRev = {
      review_id: Date.now(),
      user_name: 'You',
      rating: body.rating || 5,
      comment: body.comment || 'Wonderful travel experience!',
      created_at: 'Just now'
    };
    reviews.unshift(newRev);
    setStored(STORAGE_KEYS.REVIEWS, reviews);
    return newRev;
  }

  // Admin Analytics
  if (endpoint === '/admin/analytics') {
    return {
      total_bookings: 1428,
      confirmed_bookings: 1395,
      cancelled_bookings: 33,
      total_revenue: 1284500.0,
      total_buses: 12,
      total_routes: 8,
      total_users: 3240,
      inoperable_seats_count: 3
    };
  }

  if (endpoint.startsWith('/admin/all-bookings')) {
    return getStored(STORAGE_KEYS.BOOKINGS, [INITIAL_BOOKING]);
  }

  if (endpoint === '/buses') {
    return getStored(STORAGE_KEYS.BUSES, INITIAL_BUSES);
  }

  if (endpoint === '/buses' && method === 'POST') {
    const buses = getStored(STORAGE_KEYS.BUSES, INITIAL_BUSES);
    const newBus = {
      bus_id: Date.now(),
      bus_number: body.bus_number,
      bus_name: body.bus_name,
      bus_type: body.bus_type,
      operator_name: 'Blue Bus Fleet',
      total_capacity: body.total_capacity || 30,
      amenities: body.amenities || 'WiFi, AC, Charging Point',
      is_sleeper: (body.bus_type || '').includes('SLEEPER'),
      rating: 5.0,
      reviews_count: 0
    };
    buses.push(newBus);
    setStored(STORAGE_KEYS.BUSES, buses);
    return newBus;
  }

  if (endpoint.includes('/toggle-operable')) {
    return { message: 'Seat operability status updated successfully.' };
  }

  return { message: 'Success' };
}

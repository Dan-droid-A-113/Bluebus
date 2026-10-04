import { handleMockApi } from './mockDemoData';

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '3000' ? 'http://localhost:8080/api' : '/api');

export const getToken = () => localStorage.getItem('bluebus_token');
export const setToken = (token) => localStorage.setItem('bluebus_token', token);
export const removeToken = () => localStorage.removeItem('bluebus_token');

export const getUser = () => {
  const u = localStorage.getItem('bluebus_user');
  return u ? JSON.parse(u) : null;
};

export const setUser = (user) => {
  if (user) {
    localStorage.setItem('bluebus_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('bluebus_user');
  }
};

let isDemoMode = false;
let dbStatus = { connected: false, type: 'unknown', target: '' };
let statusListeners = [];

export const getIsDemoMode = () => isDemoMode;
export const getDbStatus = () => dbStatus;

export const subscribeDbStatus = (callback) => {
  statusListeners.push(callback);
  callback(dbStatus);
  return () => {
    statusListeners = statusListeners.filter(cb => cb !== callback);
  };
};

function notifyStatus(status) {
  dbStatus = status;
  statusListeners.forEach(cb => cb(dbStatus));
}

export async function checkBackendConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      isDemoMode = false;
      notifyStatus({
        connected: true,
        type: data.database_type || 'sqlite',
        target: data.database_target || 'bluebus.db',
        integrity: data.integrity_mode || 'WAL Mode + Foreign Keys'
      });
      return {
        connected: true,
        type: data.database_type || 'sqlite',
        target: data.database_target || 'bluebus.db',
        integrity: data.integrity_mode || 'WAL Mode + Foreign Keys'
      };
    }
  } catch (err) {
    // Backend unreachable — silently fall through to demo mode
  }
  isDemoMode = true;
  notifyStatus({ connected: false, type: 'demo', target: 'Local Storage Mock' });
  return { connected: false, mode: 'demo' };
}

export async function apiRequest(endpoint, options = {}) {
  // If explicitly in demo mode and not trying to reconnect, fallback to mock engine
  if (isDemoMode && !options.retryLive) {
    return await handleMockApi(endpoint, options);
  }

  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = 'API request failed';
      try {
        const err = await response.json();
        if (typeof err.detail === 'string') {
          errorDetail = err.detail;
        } else if (Array.isArray(err.detail)) {
          errorDetail = err.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] + ': ' : ''}${d.msg}`).join(', ');
        } else if (err.message) {
          errorDetail = err.message;
        } else {
          errorDetail = JSON.stringify(err);
        }
      } catch {
        errorDetail = await response.text();
      }
      throw new Error(errorDetail);
    }

    if (isDemoMode) {
      isDemoMode = false;
      notifyStatus({ connected: true, type: 'live', target: 'Live Backend DBMS' });
    }
    return await response.json();
  } catch (networkError) {
    console.info(`[Blue Bus] Live API server unreachable (${networkError.message}). Operating in Standalone Demo Engine mode.`);
    isDemoMode = true;
    notifyStatus({ connected: false, type: 'demo', target: 'Local Storage Mock' });
    return await handleMockApi(endpoint, options);
  }
}

// --- Auth APIs ---
export const loginApi = async (email, password) => {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setToken(data.access_token);
  setUser(data);
  return data;
};

export const registerApi = async (userData) => {
  return await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const logoutApi = () => {
  removeToken();
  setUser(null);
};

export const getProfileApi = async () => {
  return await apiRequest('/auth/me');
};

// --- Bus Search & Trips ---
export const searchBusesApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.source) query.set('source', params.source);
  if (params.destination) query.set('destination', params.destination);
  if (params.date) query.set('date', params.date);
  if (params.bus_type) query.set('bus_type', params.bus_type);
  if (params.operator_name) query.set('operator_name', params.operator_name);
  if (params.max_price) query.set('max_price', params.max_price);
  if (params.sort_by) query.set('sort_by', params.sort_by);

  return await apiRequest(`/buses/search?${query.toString()}`);
};

export const getCitiesApi = async () => {
  return await apiRequest('/routes/cities');
};

export const getTripSeatsApi = async (tripId) => {
  return await apiRequest(`/trips/${tripId}/seats`);
};

// --- Bookings & Tickets ---
export const createBookingApi = async (payload) => {
  return await apiRequest('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getMyBookingsApi = async () => {
  return await apiRequest('/bookings/my');
};

export const getBookingByPnrApi = async (pnr) => {
  return await apiRequest(`/bookings/pnr/${pnr}`);
};

// --- Cancellation & Refunds ---
export const previewCancellationApi = async (pnr) => {
  return await apiRequest(`/cancellations/preview/${pnr}`);
};

export const cancelBookingApi = async (pnr, reason) => {
  return await apiRequest(`/cancellations/${pnr}`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'User requested cancellation' })
  });
};

export const swapSeatApi = async (pnr, payload) => {
  return await apiRequest(`/bookings/${pnr}/swap-seat`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const requestPeerSwapApi = async (pnr, payload) => {
  return await apiRequest(`/bookings/${pnr}/request-swap`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getIncomingSwapRequestsApi = async () => {
  return await apiRequest('/bookings/swap-requests/incoming');
};

export const getOutgoingSwapRequestsApi = async () => {
  return await apiRequest('/bookings/swap-requests/outgoing');
};

export const respondSwapRequestApi = async (requestId, action) => {
  return await apiRequest(`/bookings/swap-requests/${requestId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
};

export const cancelSwapRequestApi = async (requestId) => {
  return await apiRequest(`/bookings/swap-requests/${requestId}/cancel`, {
    method: 'POST'
  });
};

// --- Coupons ---
export const getCouponsApi = async () => {
  return await apiRequest('/coupons');
};

export const applyCouponApi = async (code, totalAmount) => {
  return await apiRequest('/coupons/apply', {
    method: 'POST',
    body: JSON.stringify({ code, total_amount: totalAmount })
  });
};

// --- Reviews ---
export const getReviewsApi = async (busId = null, operatorId = null) => {
  const query = new URLSearchParams();
  if (busId) query.set('bus_id', busId);
  if (operatorId) query.set('operator_id', operatorId);
  return await apiRequest(`/reviews?${query.toString()}`);
};

export const submitReviewApi = async (payload) => {
  return await apiRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

// --- Admin APIs ---
export const getAdminAnalyticsApi = async () => {
  return await apiRequest('/admin/analytics');
};

export const getAdminAllBookingsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  return await apiRequest(`/admin/all-bookings?${query.toString()}`);
};

export const getAllBusesApi = async () => {
  return await apiRequest('/buses');
};

export const getBusSeatsApi = async (busId) => {
  return await apiRequest(`/buses/${busId}/seats`);
};

export const toggleBusSeatOperableApi = async (busId, seatNumber, payload) => {
  return await apiRequest(`/buses/${busId}/seats/${seatNumber}/toggle-operable`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const createBusApi = async (payload) => {
  return await apiRequest('/buses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const createTripApi = async (payload) => {
  return await apiRequest('/trips', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const createCouponApi = async (payload) => {
  return await apiRequest('/coupons', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};


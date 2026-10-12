import axios from 'axios';

// Single source of truth for the backend origin so nothing in the app
// hardcodes a host/port that would break the moment ports or domains change.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the HttpOnly refresh-token cookie to /api/auth/*
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('symptomlog_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on a 401 from an expired short-lived access token,
// silently exchange the HttpOnly refresh cookie for a new one before
// forcing the user back to login (JWT refresh token rotation).
let refreshInFlight = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    const isAuthRoute = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register') || config?.url?.includes('/auth/refresh');

    if (response && response.status === 401 && !config._retried && !isAuthRoute) {
      config._retried = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = api.post('/auth/refresh').finally(() => {
            refreshInFlight = null;
          });
        }
        const refreshRes = await refreshInFlight;
        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem('symptomlog_token', newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return api.request(config);
        }
      } catch (refreshErr) {
        // Refresh token itself is invalid/expired -- fall through to logout below.
      }

      const isPatientAppRoute =
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register') &&
        !window.location.pathname.startsWith('/share/') &&
        !window.location.pathname.startsWith('/doctor') &&
        !window.location.pathname.startsWith('/admin');

      if (isPatientAppRoute) {
        localStorage.removeItem('symptomlog_token');
        localStorage.removeItem('symptomlog_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Separate axios instance for the Physician Portal, since doctors carry a
// different JWT role and a different refresh-token cookie (scoped to /api/doctor).
const doctorApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

doctorApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('symptomlog_doctor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let doctorRefreshInFlight = null;

doctorApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    const isDocAuthRoute = config?.url?.includes('/doctor/login') || config?.url?.includes('/doctor/refresh');

    if (response && response.status === 401 && !config._retried && !isDocAuthRoute) {
      config._retried = true;
      try {
        if (!doctorRefreshInFlight) {
          doctorRefreshInFlight = doctorApiClient.post('/doctor/refresh').finally(() => {
            doctorRefreshInFlight = null;
          });
        }
        const refreshRes = await doctorRefreshInFlight;
        const newToken = refreshRes.data?.token;
        if (newToken) {
          localStorage.setItem('symptomlog_doctor_token', newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return doctorApiClient.request(config);
        }
      } catch (refreshErr) {
        // Refresh token itself is invalid/expired -- redirect to doctor login
      }

      if (window.location.pathname.startsWith('/doctor') && !window.location.pathname.startsWith('/doctor/login')) {
        localStorage.removeItem('symptomlog_doctor_token');
        localStorage.removeItem('symptomlog_doctor');
        window.location.href = '/doctor/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  toggleDarkMode: (darkMode) => api.put('/auth/dark-mode', { darkMode }),
  logout: () => api.post('/auth/logout'),
};

export const doctorApi = {
  login: (data) => doctorApiClient.post('/doctor/login', data),
  logout: () => doctorApiClient.post('/doctor/logout'),
  me: () => doctorApiClient.get('/doctor/me'),
  directory: () => api.get('/doctor/directory'),
  getAppointments: () => doctorApiClient.get('/doctor/appointments'),
  reviewAppointment: (id, data) => doctorApiClient.patch(`/doctor/appointments/${id}/review`, data),
  prescribeMedication: (id, data) => doctorApiClient.post(`/doctor/appointments/${id}/prescribe`, data),
  getPrescriptions: (id) => doctorApiClient.get(`/doctor/appointments/${id}/prescriptions`),
};

export const symptomsApi = {
  getAll: (params) => api.get('/symptoms', { params }),
  getCategories: () => api.get('/symptoms/categories'),
  getById: (id) => api.get(`/symptoms/${id}`),
};

export const entriesApi = {
  getAll: (params) => api.get('/entries', { params }),
  getById: (id) => api.get(`/entries/${id}`),
  create: (data) => api.post('/entries', data),
  update: (id, data) => api.put(`/entries/${id}`, data),
  delete: (id) => api.delete(`/entries/${id}`),
  uploadAttachment: (id, formData) =>
    api.post(`/entries/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const nlpApi = {
  extract: (text) => api.post('/nlp/extract', { text }),
  predictDisease: (text) => api.post('/nlp/predict-disease', { text }),
  getDiseases: () => api.get('/nlp/diseases'),
  smartAnalyze: (text, overrides) => api.post('/nlp/smart-analyze', { text, overrides }),
  getNumericalStats: () => api.get('/nlp/numerical-stats'),
};

export const medicationsApi = {
  getAll: () => api.get('/medications'),
  create: (data) => api.post('/medications', data),
  update: (id, data) => api.put(`/medications/${id}`, data),
  toggle: (id) => api.patch(`/medications/${id}/toggle`),
  delete: (id) => api.delete(`/medications/${id}`),
};

export const remindersApi = {
  getAll: () => api.get('/reminders'),
  create: (data) => api.post('/reminders', data),
  update: (id, data) => api.put(`/reminders/${id}`, data),
  toggle: (id) => api.patch(`/reminders/${id}/toggle`),
  delete: (id) => api.delete(`/reminders/${id}`),
  logDose: (id, data) => api.post(`/reminders/${id}/dose`, data),
  undoDose: (id, date) => api.delete(`/reminders/${id}/dose/${date}`),
  getDoseHistory: (since) => api.get('/reminders/doses', { params: since ? { since } : {} }),
};

export const pushApi = {
  getPublicKey: () => api.get('/push/vapid-public-key'),
  subscribe: (subscription) => api.post('/push/subscribe', subscription),
  unsubscribe: (endpoint) => api.post('/push/unsubscribe', { endpoint }),
};

export const appointmentsApi = {
  getAll: () => api.get('/appointments'),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  updateStatus: (id, status) => api.patch(`/appointments/${id}/status`, { status }),
  delete: (id) => api.delete(`/appointments/${id}`),
};

export const reportsApi = {
  getAll: () => api.get('/reports'),
  generate: (data) => api.post('/reports/generate', data),
};

export const insightsApi = {
  getInsights: () => api.get('/insights'),
};

export const feedbackApi = {
  submit: (data) => api.post('/feedback', data),
  getStats: () => api.get('/feedback/stats'),
};

// Separate axios instance for the Admin Portal
const adminApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

adminApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('symptomlog_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/admin/login')) {
        localStorage.removeItem('symptomlog_admin_token');
        localStorage.removeItem('symptomlog_admin');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  login: (data) => adminApiClient.post('/admin/login', data),
  logout: () => adminApiClient.post('/admin/logout'),
  me: () => adminApiClient.get('/admin/me'),
  getStats: () => adminApiClient.get('/admin/stats'),
  getDoctors: () => adminApiClient.get('/admin/doctors'),
  addDoctor: (data) => adminApiClient.post('/admin/doctors', data),
  removeDoctor: (id) => adminApiClient.delete(`/admin/doctors/${id}`),
  getAppointments: () => adminApiClient.get('/admin/appointments'),
  updateAppointment: (id, data) => adminApiClient.put(`/admin/appointments/${id}`, data),
  getDatasetStatus: () => adminApiClient.get('/admin/dataset/status'),
  uploadDataset: (formData) =>
    adminApiClient.post('/admin/dataset/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const caregiverApi = {
  generateLink: (days_valid) => api.post('/caregiver/generate', { days_valid }),
  getView: (token) => api.get(`/caregiver/view/${token}`),
};

export default api;

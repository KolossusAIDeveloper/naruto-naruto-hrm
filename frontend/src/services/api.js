import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/token/', data),
  refresh: (data) => api.post('/auth/token/refresh/', data),
};

export const employeesAPI = {
  list: (params) => api.get('/employees/', { params }),
  get: (id) => api.get(`/employees/${id}/`),
  create: (data) => api.post('/employees/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.patch(`/employees/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/employees/${id}/`),
  stats: () => api.get('/employees/dashboard_stats/'),
};

export const departmentsAPI = {
  list: (params) => api.get('/departments/', { params }),
  get: (id) => api.get(`/departments/${id}/`),
  create: (data) => api.post('/departments/', data),
  update: (id, data) => api.patch(`/departments/${id}/`, data),
  delete: (id) => api.delete(`/departments/${id}/`),
  employees: (id) => api.get(`/departments/${id}/employees/`),
};

export const leavesAPI = {
  list: (params) => api.get('/leaves/', { params }),
  get: (id) => api.get(`/leaves/${id}/`),
  create: (data) => api.post('/leaves/', data),
  update: (id, data) => api.patch(`/leaves/${id}/`, data),
  approve: (id, data) => api.post(`/leaves/${id}/approve/`, data),
  reject: (id, data) => api.post(`/leaves/${id}/reject/`, data),
  cancel: (id) => api.post(`/leaves/${id}/cancel/`),
  balances: (params) => api.get('/leave-balances/', { params }),
};

export const attendanceAPI = {
  list: (params) => api.get('/attendance/', { params }),
  daily: (date) => api.get('/attendance/daily/', { params: { date } }),
  mark: (data) => api.post('/attendance/mark/', data),
  bulkMark: (data) => api.post('/attendance/bulk_mark/', data),
  monthlyReport: (params) => api.get('/attendance/monthly_report/', { params }),
  heatmap: (params) => api.get('/attendance/heatmap/', { params }),
};

export const payrollAPI = {
  list: (params) => api.get('/payroll/', { params }),
  get: (id) => api.get(`/payroll/${id}/`),
  create: (data) => api.post('/payroll/', data),
  update: (id, data) => api.patch(`/payroll/${id}/`, data),
  process: (id) => api.post(`/payroll/${id}/process/`),
  markProcessed: (id, data) => api.post(`/payroll/${id}/process/`, data),
  generate: (data) => api.post('/payroll/generate/', data),
  exportCSV: (params) => api.get('/payroll/export_csv/', { params, responseType: 'blob' }),
};

export const announcementsAPI = {
  list: (params) => api.get('/announcements/', { params }),
  get: (id) => api.get(`/announcements/${id}/`),
  create: (data) => api.post('/announcements/', data),
  update: (id, data) => api.patch(`/announcements/${id}/`, data),
  delete: (id) => api.delete(`/announcements/${id}/`),
  archive: (id) => api.post(`/announcements/${id}/archive/`),
};

export const activityAPI = {
  list: (params) => api.get('/activity-logs/', { params }),
};

export default api;

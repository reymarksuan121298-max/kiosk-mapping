import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Axios instance with base configuration
 */
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor: Attach JWT token to every request if available
 */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Response Interceptor: Handle 401 Unauthorized errors (token expiration)
 */
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login if on the client side
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Authentication API Endpoints
 */
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),

    register: (email: string, password: string, fullName: string) =>
        api.post('/auth/register', { email, password, fullName }),

    verify: () => api.get('/auth/verify'),
};

/**
 * Employee Data Types
 */
export interface Employee {
    id?: string;
    employeeId: string;
    fullName: string;
    spvr?: string;
    role: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    franchise?: string;
    area?: string;
    status: 'Active' | 'Deactive';
    radiusMeters?: number;
    photoUrl?: string;
    qrCode?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Employee API Endpoints
 */
export const employeeAPI = {
    getAll: (params?: {
        status?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }) => api.get('/employees', { params }),

    getById: (id: string) => api.get(`/employees/${id}`),

    create: (employee: Employee) => api.post('/employees', employee),

    update: (id: string, employee: Employee) => api.put(`/employees/${id}`, employee),

    delete: (id: string) => api.delete(`/employees/${id}`),

    getStats: () => api.get('/employees/stats/summary'),

    uploadPhoto: (file: File) => {
        const formData = new FormData();
        formData.append('photo', file);
        return api.post('/employees/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
};

/**
 * Audit Log API Endpoints
 */
export const auditAPI = {
    getLogs: (params?: {
        limit?: number;
        offset?: number;
        action?: string;
        userId?: string;
    }) => api.get('/audit', { params }),

    getLogById: (id: string) => api.get(`/audit/${id}`),
    clearLogs: () => api.delete('/audit'),
};

/**
 * Monitoring API Endpoints
 */
export const monitoringAPI = {
    scan: (data: { employeeId: string; latitude?: number; longitude?: number; status?: 'Active' | 'Inactive'; remarks?: string }) =>
        api.post('/monitoring/scan', data),

    getOnDuty: () => api.get('/monitoring/on-duty'),

    getHistory: (params?: { limit?: number }) =>
        api.get('/monitoring/history', { params }),

    getDailyMap: () => api.get('/monitoring/daily-map'),
};

export default api;

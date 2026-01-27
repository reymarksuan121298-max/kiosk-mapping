import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authAPI = {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
};

export const monitoringAPI = {
    scan: (data: { employeeId: string; latitude?: number; longitude?: number; status?: 'Active' | 'Inactive'; remarks?: string }) =>
        api.post('/monitoring/scan', data),
};

export default api;

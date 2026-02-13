import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

export const attendanceAPI = {
    clock: (data: {
        employeeId: string;
        type: 'Time In' | 'Time Out';
        latitude: number;
        longitude: number;
    }) => api.post('/attendance/clock-in', data),

    getLastAttendance: (employeeId: string) =>
        api.get(`/attendance/last/${employeeId}`),
};

export default api;

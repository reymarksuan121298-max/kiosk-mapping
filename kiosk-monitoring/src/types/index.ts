export interface User {
    id: string;
    email: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Employee {
    id?: string;
    employeeId: string;
    fullName: string;
    role: string;
    franchise: string;
    area?: string;
    photoUrl?: string; // Important for displaying photo after scan
}

export interface ScanResponse {
    success: boolean;
    message: string;
    employee?: Employee;
    scanTime?: string;
}

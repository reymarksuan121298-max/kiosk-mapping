import { useState, useEffect } from 'react';
import { Search, Download, MapPin, AlertTriangle, Clock } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AttendanceRecord {
    id: string;
    scan_time: string;
    latitude: number | null;
    longitude: number | null;
    distance_meters: number | null;
    alert_type: string | null;
    status: string;
    remarks: string | null;
    scan_source?: string;
    // Employee data can be nested or flat
    employee?: {
        employee_id: string;
        full_name: string;
        role: string;
        franchise: string;
        area: string;
        spvr: string;
    };
    employees?: {
        employee_id: string;
        full_name: string;
        role: string;
        franchise: string;
        area: string;
        spvr: string;
    };
    // Or flat properties
    employee_id?: string;
    full_name?: string;
    role?: string;
    franchise?: string;
    area?: string;
    spvr?: string;
}

export default function AttendanceTablePage() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('today');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadAttendance();
    }, [dateFilter, statusFilter]);

    const loadAttendance = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Explicitly filter for employee_attendance source if needed, 
            // but backend history currently returns all. 
            // We apply a client-side filter for now to be safe.
            const response = await axios.get(`${API_URL}/monitoring/history?limit=1000`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const allHistory: AttendanceRecord[] = response.data.history || [];
            const attendanceOnly = allHistory.filter(r => r.scan_source === 'employee_attendance' || !r.scan_source);

            setAttendance(attendanceOnly);
        } catch (error) {
            console.error('Failed to load attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to safely get employee data
    const getEmployeeData = (record: AttendanceRecord) => {
        const emp = record.employees || record.employee;
        return {
            employeeId: emp?.employee_id || record.employee_id || 'N/A',
            fullName: emp?.full_name || record.full_name || 'Unknown',
            role: emp?.role || record.role || 'N/A',
            franchise: emp?.franchise || record.franchise || 'N/A',
            area: emp?.area || record.area || '',
            spvr: emp?.spvr || record.spvr || '',
        };
    };

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Records');

        // Define columns
        worksheet.columns = [
            { header: 'Date & Time', key: 'scanTime', width: 20 },
            { header: 'Employee ID', key: 'employeeId', width: 20 },
            { header: 'Full Name', key: 'fullName', width: 30 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Franchise', key: 'franchise', width: 30 },
            { header: 'Area', key: 'area', width: 12 },
            { header: 'SPVR', key: 'spvr', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Latitude', key: 'latitude', width: 15 },
            { header: 'Longitude', key: 'longitude', width: 15 },
            { header: 'Distance (m)', key: 'distance', width: 12 },
            { header: 'Alert', key: 'alert', width: 20 },
            { header: 'Remarks', key: 'remarks', width: 30 },
        ];

        // Add rows
        filteredAttendance.forEach((record: AttendanceRecord) => {
            const emp = getEmployeeData(record);
            worksheet.addRow({
                scanTime: new Date(record.scan_time).toLocaleString(),
                employeeId: emp.employeeId,
                fullName: emp.fullName,
                role: emp.role,
                franchise: emp.franchise,
                area: emp.area,
                spvr: emp.spvr,
                status: record.status,
                latitude: record.latitude || '',
                longitude: record.longitude || '',
                distance: record.distance_meters || '',
                alert: record.alert_type || '',
                remarks: record.remarks || '',
            });
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4F46E5' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });

        // Generate buffer and save
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `attendance_records_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredAttendance = attendance.filter((record) => {
        // Safely access employee data
        const employeeName = record.employee?.full_name || record.full_name || '';
        const employeeId = record.employee?.employee_id || record.employee_id || '';

        // Search filter
        const matchesSearch = searchQuery === '' ||
            employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employeeId.toLowerCase().includes(searchQuery.toLowerCase());

        // Date filter
        const recordDate = new Date(record.scan_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let matchesDate = true;
        if (dateFilter === 'today') {
            matchesDate = recordDate >= today;
        } else if (dateFilter === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchesDate = recordDate >= weekAgo;
        } else if (dateFilter === 'month') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            matchesDate = recordDate >= monthAgo;
        }

        // Status filter
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

        return matchesSearch && matchesDate && matchesStatus;
    });

    const stats = {
        total: filteredAttendance.length,
        active: filteredAttendance.filter(r => r.status === 'Active').length,
        inactive: filteredAttendance.filter(r => r.status === 'Inactive').length,
        withAlerts: filteredAttendance.filter(r => r.alert_type).length,
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Attendance Records</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage employee attendance logs
                    </p>
                </div>
                <Button onClick={handleExportExcel} size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Export Excel
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Records</CardDescription>
                        <CardTitle className="text-3xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Time In</CardDescription>
                        <CardTitle className="text-3xl text-blue-500">{stats.active}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Time Out</CardDescription>
                        <CardTitle className="text-3xl text-orange-500">{stats.inactive}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>With Alerts</CardDescription>
                        <CardTitle className="text-3xl text-amber-500">{stats.withAlerts}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[300px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={dateFilter === 'today' ? 'default' : 'outline'}
                                onClick={() => setDateFilter('today')}
                            >
                                Today
                            </Button>
                            <Button
                                variant={dateFilter === 'week' ? 'default' : 'outline'}
                                onClick={() => setDateFilter('week')}
                            >
                                This Week
                            </Button>
                            <Button
                                variant={dateFilter === 'month' ? 'default' : 'outline'}
                                onClick={() => setDateFilter('month')}
                            >
                                This Month
                            </Button>
                            <Button
                                variant={dateFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setDateFilter('all')}
                            >
                                All Time
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={statusFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('all')}
                            >
                                All Types
                            </Button>
                            <Button
                                variant={statusFilter === 'Active' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('Active')}
                            >
                                Time In
                            </Button>
                            <Button
                                variant={statusFilter === 'Inactive' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('Inactive')}
                            >
                                Time Out
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Logs</CardTitle>
                    <CardDescription>
                        {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : filteredAttendance.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No attendance records found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-4 font-medium text-muted-foreground">Date & Time</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Employee</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Area</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Location</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Distance</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAttendance.map((record: AttendanceRecord) => {
                                        const emp = getEmployeeData(record);
                                        return (
                                            <tr key={record.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <div className="font-medium text-sm">
                                                                {new Date(record.scan_time).toLocaleDateString()}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {new Date(record.scan_time).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div>
                                                        <div className="font-medium">{emp.fullName}</div>
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            {emp.employeeId}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                                        {emp.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm font-medium">
                                                    {emp.area || '-'}
                                                </td>
                                                <td className="p-4">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-xs font-bold ${record.status === 'Active'
                                                            ? 'bg-blue-500/10 text-blue-500'
                                                            : 'bg-orange-500/10 text-orange-500'
                                                            }`}
                                                    >
                                                        {record.status === 'Active' ? 'TIME IN' : 'TIME OUT'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {record.latitude && record.longitude ? (
                                                        <div className="flex items-center gap-1 text-xs font-mono">
                                                            <MapPin className="h-3 w-3 text-blue-500" />
                                                            <span className="text-muted-foreground">
                                                                {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs italic">No GPS</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {record.distance_meters !== null ? (
                                                        <div className="flex items-center gap-1">
                                                            {record.alert_type && (
                                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                            )}
                                                            <span className={`text-sm ${record.alert_type ? 'text-amber-500 font-medium' : ''}`}>
                                                                {record.distance_meters}m
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-sm max-w-[200px] truncate">
                                                    {record.remarks || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

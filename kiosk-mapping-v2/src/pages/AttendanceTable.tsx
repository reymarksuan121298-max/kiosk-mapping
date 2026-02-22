import { useState, useEffect } from 'react';
import { Search, Download, MapPin, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import axios from 'axios';
import { cn } from '@/lib/utils';

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
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Attendance</h1>
                    <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                        View and manage employee attendance logs
                    </p>
                </div>
                <Button onClick={handleExportExcel} size="lg" className="w-full md:w-auto">
                    <Download className="mr-2 h-5 w-5" />
                    Export Excel
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Card>
                    <CardHeader className="p-3 md:pb-2">
                        <CardDescription className="text-xs">Total Records</CardDescription>
                        <CardTitle className="text-xl md:text-3xl">{stats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="p-3 md:pb-2">
                        <CardDescription className="text-xs">Time In</CardDescription>
                        <CardTitle className="text-xl md:text-3xl text-blue-500">{stats.active}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="p-3 md:pb-2">
                        <CardDescription className="text-xs">Time Out</CardDescription>
                        <CardTitle className="text-xl md:text-3xl text-orange-500">{stats.inactive}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="p-3 md:pb-2">
                        <CardDescription className="text-xs">Alerts</CardDescription>
                        <CardTitle className="text-xl md:text-3xl text-amber-500">{stats.withAlerts}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 w-full">
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
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex gap-1 bg-muted p-1 rounded-lg">
                                {['today', 'week', 'month', 'all'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setDateFilter(f)}
                                        className={cn(
                                            "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                            dateFilter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-1 bg-muted p-1 rounded-lg">
                                {['all', 'Active', 'Inactive'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setStatusFilter(f)}
                                        className={cn(
                                            "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                            statusFilter === f ? (f === 'Active' ? "bg-blue-500 text-white shadow-sm" : f === 'Inactive' ? "bg-orange-500 text-white shadow-sm" : "bg-background text-foreground shadow-sm") : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {f === 'all' ? 'All Types' : f === 'Active' ? 'Time In' : 'Time Out'}
                                    </button>
                                ))}
                            </div>
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
                        <div className="overflow-x-auto relative rounded-md border border-border/50">
                            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                <table className="w-full">
                                    <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
                                        <tr className="border-b border-border">
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Date & Time</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Employee</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Role</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Area</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Status</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Location</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Distance</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Remarks</th>
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
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 border-t border-border/50 py-3 px-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Displaying <span className="font-bold text-foreground">{filteredAttendance.length}</span> attendance records</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                        Scroll down to see more records <ChevronRight className="w-3 h-3 rotate-90" />
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

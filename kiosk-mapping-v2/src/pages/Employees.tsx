import { useState, useEffect } from 'react';
import { Plus, Search, Download, Edit, Trash2, QrCode, Barcode as BarcodeIcon } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { employeeAPI, type Employee } from '@/lib/api';
import EmployeeDialog from '@/components/EmployeeDialog';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import ReactBarcode from 'react-barcode';

// Generate consistent color for each SPVR (same as Map.tsx)
const getSPVRColor = (spvr: string | undefined) => {
    if (!spvr) return '#94a3b8'; // Grey for no SPVR

    // Hash the SPVR string to get a consistent color
    let hash = 0;
    for (let i = 0; i < spvr.length; i++) {
        hash = spvr.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Predefined vibrant colors for common SPVRs
    const colors = [
        '#ef4444', // Red
        '#f59e0b', // Amber
        '#10b981', // Emerald
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#14b8a6', // Teal
        '#f97316', // Orange
        '#06b6d4', // Cyan
        '#6366f1', // Indigo
    ];

    return colors[Math.abs(hash) % colors.length];
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [codeType, setCodeType] = useState<'qr' | 'barcode'>('qr');
    const [user] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const isAdmin = user?.role === 'admin';

    const getCodeData = (emp: Employee) => {
        return `ID:${emp.employeeId}\nName:${emp.fullName}\nRole:${emp.role}\nFranchise:${emp.franchise || 'N/A'}\nSPVR:${emp.spvr || 'N/A'}`;
    };

    const getBarcodeData = (emp: Employee) => {
        return `ID:${emp.employeeId}\nName:${emp.fullName}`;
    };

    useEffect(() => {
        loadEmployees();
    }, [searchQuery, statusFilter]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const response = await employeeAPI.getAll({
                search: searchQuery,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                sortBy: 'created_at',
                sortOrder: 'desc',
            });
            setEmployees(response.data.employees);

            // Also update total stats for ID generation
            const stats = await employeeAPI.getStats();
            setTotalCount(stats.data.total);
        } catch (error) {
            console.error('Failed to load employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;

        try {
            await employeeAPI.delete(id);
            loadEmployees();
        } catch (error) {
            console.error('Failed to delete employee:', error);
            alert('Failed to delete employee');
        }
    };

    const handleEdit = (employee: Employee) => {
        setEditingEmployee(employee);
        setDialogOpen(true);
    };

    const handleAdd = () => {
        setEditingEmployee(null);
        setDialogOpen(true);
    };

    const handleDialogClose = (success?: boolean) => {
        setDialogOpen(false);
        setEditingEmployee(null);
        if (success) {
            loadEmployees();
        }
    };

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Employees');

        // Define columns
        worksheet.columns = [
            { header: 'Employee ID', key: 'employeeId', width: 20 },
            { header: 'Full Name', key: 'fullName', width: 30 },
            { header: 'Franchise', key: 'franchise', width: 30 },
            { header: 'SPVR', key: 'spvr', width: 20 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Latitude', key: 'latitude', width: 15 },
            { header: 'Longitude', key: 'longitude', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        // Add rows
        employees.forEach((emp: Employee) => {
            worksheet.addRow({
                employeeId: emp.employeeId,
                fullName: emp.fullName,
                franchise: emp.franchise || '',
                spvr: emp.spvr || '',
                role: emp.role,
                address: emp.address || '',
                latitude: emp.latitude || '',
                longitude: emp.longitude || '',
                status: emp.status,
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
                fgColor: { argb: 'FF4F46E5' } // primary color
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });

        // Generate buffer and save
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const showCode = (employee: Employee, type: 'qr' | 'barcode' = 'qr') => {
        setSelectedEmployee(employee);
        setCodeType(type);
        setQrDialogOpen(true);
    };

    const downloadCode = () => {
        if (!selectedEmployee) return;
        const selector = codeType === 'qr' ? '#qr-canvas' : '#barcode-canvas svg';
        const element = document.querySelector(selector);

        if (element) {
            if (codeType === 'qr') {
                const canvas = element as HTMLCanvasElement;
                const url = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = url;
                const fileName = `QR_${selectedEmployee.fullName.replace(/\s+/g, '_')}.png`;
                link.download = fileName;
                link.click();
            } else {
                // For SVG barcode
                const svgData = new XMLSerializer().serializeToString(element);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                    const url = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = url;
                    const fileName = `Barcode_${selectedEmployee.fullName.replace(/\s+/g, '_')}.png`;
                    link.download = fileName;
                    link.click();
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
            }
        }
    };

    const filteredEmployees = employees;

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Employees</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage employee records and information
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={handleAdd} size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        Add Employee
                    </Button>
                )}
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
                                variant={statusFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('all')}
                            >
                                All
                            </Button>
                            <Button
                                variant={statusFilter === 'Active' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('Active')}
                            >
                                Active
                            </Button>
                            <Button
                                variant={statusFilter === 'Deactive' ? 'default' : 'outline'}
                                onClick={() => setStatusFilter('Deactive')}
                            >
                                Inactive
                            </Button>
                        </div>
                        <Button variant="outline" onClick={handleExportExcel}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Excel
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Employee Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Employee Records</CardTitle>
                    <CardDescription>
                        {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No employees found. Click "Add Employee" to create one.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left p-4 font-medium text-muted-foreground">ID</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Franchise</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Group</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Address</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">GPS</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                                        {isAdmin && <th className="text-left p-4 font-medium text-muted-foreground">Code</th>}
                                        {isAdmin && <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.map((employee: Employee) => (
                                        <tr key={employee.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                                            <td className="p-4 font-mono text-sm">{employee.employeeId}</td>
                                            <td className="p-4 font-medium">{employee.fullName}</td>
                                            <td className="p-4 text-sm font-medium text-primary/80">{employee.franchise || '-'}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                                                        style={{ backgroundColor: getSPVRColor(employee.spvr) }}
                                                        title={employee.spvr || 'No SPVR'}
                                                    ></span>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {employee.spvr || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                                    {employee.role}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm max-w-[200px] truncate">{employee.address || '-'}</td>
                                            <td className="p-4">
                                                {employee.latitude && employee.longitude ? (
                                                    <span className="flex flex-col text-[10px] font-mono text-green-500 leading-tight">
                                                        <span>Lat: {employee.latitude.toFixed(6)}</span>
                                                        <span>Lon: {employee.longitude.toFixed(6)}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">No coordinates</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${employee.status === 'Active'
                                                        ? 'bg-green-500/10 text-green-500'
                                                        : 'bg-red-500/10 text-red-500'
                                                        }`}
                                                >
                                                    {employee.status}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => showCode(employee, 'qr')}
                                                            title="View QR Code"
                                                        >
                                                            <QrCode className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => showCode(employee, 'barcode')}
                                                            title="View Barcode"
                                                        >
                                                            <BarcodeIcon className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                            {isAdmin && (
                                                <td className="p-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(employee)}
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(employee.id!, employee.fullName)}
                                                            title="Delete"
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Employee Dialog */}
            <EmployeeDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                employee={editingEmployee}
                totalCount={totalCount}
            />

            {/* QR/Barcode Dialog */}
            {qrDialogOpen && selectedEmployee && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                    onClick={() => setQrDialogOpen(false)}
                >
                    <div
                        className="bg-card p-8 rounded-lg max-w-xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedEmployee.fullName}</h2>
                                <p className="text-sm text-muted-foreground">{selectedEmployee.employeeId}</p>
                            </div>
                            <div className="flex bg-muted p-1 rounded-md">
                                <Button
                                    variant={codeType === 'qr' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCodeType('qr')}
                                    className="h-8"
                                >
                                    QR
                                </Button>
                                <Button
                                    variant={codeType === 'barcode' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCodeType('barcode')}
                                    className="h-8"
                                >
                                    Barcode
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg flex flex-col justify-center mb-4 min-h-[300px] items-center">
                            {codeType === 'qr' ? (
                                <QRCode id="qr-canvas" value={getCodeData(selectedEmployee)} size={256} level="H" />
                            ) : (
                                <div id="barcode-canvas" className="w-full flex justify-center overflow-x-auto py-4">
                                    <ReactBarcode
                                        value={getBarcodeData(selectedEmployee)}
                                        width={1.5}
                                        height={100}
                                        displayValue={false}
                                        background="transparent"
                                        fontSize={12}
                                    />
                                </div>
                            )}
                            <div className="mt-4 w-full p-4 bg-slate-50 rounded border text-xs font-mono text-slate-600">
                                <p className="font-bold mb-1 text-slate-800">Encoded Data:</p>
                                <pre className="whitespace-pre-wrap">
                                    {codeType === 'qr' ? getCodeData(selectedEmployee) : getBarcodeData(selectedEmployee)}
                                </pre>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={downloadCode} className="flex-1">
                                <Download className="mr-2 h-4 w-4" />
                                Download {codeType === 'qr' ? 'QR' : 'Barcode'}
                            </Button>
                            <Button variant="outline" onClick={() => setQrDialogOpen(false)} className="flex-1">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

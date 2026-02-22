import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Download, QrCode, Barcode as BarcodeIcon, FileText, Loader2, ChevronRight, Users } from 'lucide-react';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    const [codeType, setCodeType] = useState<'qr' | 'barcode'>('qr');
    const [exporting, setExporting] = useState(false);
    const [user] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const isAdmin = user?.role === 'admin';

    const getCodeData = (emp: Employee) => {
        return `ID:${emp.employeeId} \nName:${emp.fullName} \nRole:${emp.role} \nFranchise:${emp.franchise || 'N/A'} \nSPVR:${emp.spvr || 'N/A'} `;
    };

    const getBarcodeData = (emp: Employee) => {
        return emp.employeeId;
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
        headerRow.eachCell((cell: any) => {
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

    const getEmployeeSection = async (emp: Employee) => {
        const getImageBuffer = async (url: string) => {
            try {
                const response = await fetch(url);
                if (!response.ok) return null;
                return await response.arrayBuffer();
            } catch (e) {
                console.error("Image fetch error:", e);
                return null;
            }
        };

        const getMunicipalityFromCoords = async (lat?: number, lon?: number) => {
            if (!lat || !lon) return 'N/A';
            try {
                // Using Nominatim (OpenStreetMap) for free reverse geocoding
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
                if (!response.ok) return 'N/A';
                const data = await response.json();

                // Nominatim returns town, city, or municipality in different fields
                const address = data.address;
                const municipality = address.municipality || address.city || address.town || address.village || 'N/A';
                return municipality.toUpperCase();
            } catch (e) {
                console.error("Geocoding error:", e);
                return 'N/A';
            }
        };

        // Fetch municipality and images in parallel
        const [photoBuffer, screenshotBuffer, provinceMunicipality] = await Promise.all([
            emp.photoUrl ? getImageBuffer(emp.photoUrl) : Promise.resolve(null),
            emp.coordinateScreenshotUrl ? getImageBuffer(emp.coordinateScreenshotUrl) : Promise.resolve(null),
            getMunicipalityFromCoords(emp.latitude, emp.longitude)
        ]);

        return {
            properties: {
                page: {
                    margin: { top: 720, right: 720, bottom: 720, left: 720 },
                },
            },
            children: [
                new Paragraph({
                    spacing: { line: 480 },
                    children: [
                        new TextRun({ text: "MUNICIPALITY: ", bold: true, size: 28, font: "Lexend" }),
                        new TextRun({ text: (emp.municipality || provinceMunicipality).toUpperCase(), size: 28, font: "Lexend" }),
                    ],
                }),
                new Paragraph({
                    spacing: { line: 480 },
                    children: [
                        new TextRun({ text: "SPVR: ", bold: true, size: 28, font: "Lexend" }),
                        new TextRun({ text: emp.spvr || 'N/A', size: 28, font: "Lexend" }),
                    ],
                }),
                new Paragraph({
                    spacing: { line: 480 },
                    children: [
                        new TextRun({ text: "BOOTH NUMBER: ", bold: true, size: 28, font: "Lexend" }),
                        new TextRun({ text: emp.employeeId, size: 28, font: "Lexend" }),
                    ],
                }),
                new Paragraph({
                    spacing: { line: 480 },
                    children: [
                        new TextRun({ text: "ADDRESS: ", bold: true, size: 28, font: "Lexend" }),
                        new TextRun({ text: emp.address || '', size: 28, font: "Lexend" }),
                    ],
                }),
                new Paragraph({
                    spacing: { line: 480 },
                    children: [
                        new TextRun({ text: "AGENT: ", bold: true, size: 28, font: "Lexend" }),
                        new TextRun({ text: emp.fullName, size: 28, font: "Lexend" }),
                    ],
                }),
                new Paragraph({
                    spacing: { line: 480 },
                    children: [
                        new TextRun({ text: "DESCRIPTION: ", bold: true, size: 28, font: "Lexend" }),
                        new TextRun({ text: "PROPOSED LOCATION OF THE BOOTH/STATION SKETCH MAP OF THE BOOTH/STATION", size: 28, font: "Lexend" }),
                    ],
                }),
                new Paragraph({
                    spacing: { line: 480 },
                    children: [
                        new TextRun({ text: "COORDINATES: ", bold: true, size: 28, font: "Lexend" }),
                        new TextRun({ text: `Lat ${emp.latitude || ''} Long ${emp.longitude || ''}`, size: 28, font: "Lexend" }),
                    ],
                }),
                new Paragraph({ text: "", spacing: { after: 400, line: 480 } }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NONE, size: 0 },
                        bottom: { style: BorderStyle.NONE, size: 0 },
                        left: { style: BorderStyle.NONE, size: 0 },
                        right: { style: BorderStyle.NONE, size: 0 },
                        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                        insideVertical: { style: BorderStyle.NONE, size: 0 },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    children: photoBuffer ? [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new ImageRun({
                                                    data: new Uint8Array(photoBuffer),
                                                    transformation: { width: 300, height: 500 },
                                                    type: "png",
                                                }),
                                            ],
                                        }),
                                    ] : [new Paragraph({ text: "No Photo Available", alignment: AlignmentType.CENTER })],
                                }),
                                new TableCell({
                                    width: { size: 50, type: WidthType.PERCENTAGE },
                                    children: screenshotBuffer ? [
                                        new Paragraph({
                                            alignment: AlignmentType.CENTER,
                                            children: [
                                                new ImageRun({
                                                    data: new Uint8Array(screenshotBuffer),
                                                    transformation: { width: 300, height: 500 },
                                                    type: "png",
                                                }),
                                            ],
                                        }),
                                    ] : [new Paragraph({ text: "No GPS Screenshot Available", alignment: AlignmentType.CENTER })],
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        };
    };

    const handleBatchExportDocx = async (mode: 'merged' | 'spvr' | 'individual') => {
        if (employees.length === 0) return;

        const modeText =
            mode === 'merged' ? "a single merged DOCX" :
                mode === 'spvr' ? "a ZIP containing one DOCX per Supervisor" :
                    "a ZIP with individual DOCX files for each agent";

        if (!confirm(`Exporting reports for ${employees.length} employees into ${modeText}. This may take a while. Continue?`)) return;

        try {
            setExporting(true);

            const zip = new JSZip();
            let processedCount = 0;

            if (mode === 'merged') {
                const sections = [];
                for (const emp of employees) {
                    processedCount++;
                    const section = await getEmployeeSection(emp);
                    sections.push(section);
                }
                const doc = new Document({ sections });
                const blob = await Packer.toBlob(doc);
                saveAs(blob, `All_Kiosk_Reports_${new Date().toISOString().split('T')[0]}.docx`);
            }
            else if (mode === 'spvr') {
                // Group by supervisor
                const groups: Record<string, Employee[]> = {};
                employees.forEach(emp => {
                    const s = emp.spvr || 'Unassigned';
                    if (!groups[s]) groups[s] = [];
                    groups[s].push(emp);
                });

                for (const [spvr, groupEmps] of Object.entries(groups)) {
                    const sections = [];
                    for (const emp of groupEmps) {
                        processedCount++;
                        const section = await getEmployeeSection(emp);
                        sections.push(section);
                    }
                    const doc = new Document({ sections });
                    const blob = await Packer.toBlob(doc);
                    const sanitizedSpvr = spvr.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').trim();
                    zip.file(`[${sanitizedSpvr}]_Reports.docx`, blob);
                }
                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `Reports_By_Group_${new Date().toISOString().split('T')[0]}.zip`);
            }
            else { // 'individual'
                for (const emp of employees) {
                    processedCount++;
                    const section = await getEmployeeSection(emp);
                    const doc = new Document({ sections: [section] });
                    const blob = await Packer.toBlob(doc);

                    const spvrName = (emp.spvr || 'NO_SPVR').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').trim();
                    const sanitizedName = emp.fullName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').trim();

                    zip.file(`${spvrName}/${sanitizedName}.docx`, blob);
                }
                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `Individual_Reports_${new Date().toISOString().split('T')[0]}.zip`);
            }
        } catch (error) {
            console.error("Batch export failed:", error);
            alert("Batch export failed. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const handleExportDocx = async (emp: Employee) => {
        try {
            const section = await getEmployeeSection(emp);
            const doc = new Document({ sections: [section] });
            const blob = await Packer.toBlob(doc);
            const spvrName = (emp.spvr || 'NO_SPVR').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').trim();
            const sanitizedName = emp.fullName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').trim();
            saveAs(blob, `[${spvrName}] ${sanitizedName}.docx`);
        } catch (error) {
            console.error("Failed to generate DOCX", error);
            alert("An error occurred while generating the DOCX report.");
        }
    };

    const downloadCode = () => {
        if (!selectedEmployee) return;

        // Sanitize employee name for filename (remove special characters, replace spaces with underscores)
        const sanitizedName = selectedEmployee.fullName
            .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .trim();

        const selector = codeType === 'qr' ? '#qr-canvas' : '#barcode-canvas svg';
        const element = document.querySelector(selector);

        if (element) {
            if (codeType === 'qr') {
                const canvas = element as HTMLCanvasElement;
                const url = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = url;
                link.download = `QR_${sanitizedName}.png`;
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
                    link.download = `Barcode_${sanitizedName}.png`;
                    link.click();
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
            }
        }
    };


    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Employees</h1>
                    <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                        Manage employee records and information
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={handleAdd} size={"lg" as any} className="w-full md:w-auto">
                        <Plus className="mr-2 h-5 w-5" />
                        Add Employee
                    </Button>
                )}
            </div>

            {/* Filters */}
            <Card className="overflow-hidden">
                <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 w-full lg:min-w-[300px]">
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

                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex gap-1 bg-muted p-1 rounded-lg w-full sm:w-auto">
                                <Button
                                    variant={(statusFilter === 'all' ? 'secondary' : 'ghost') as any}
                                    size="sm"
                                    onClick={() => setStatusFilter('all')}
                                    className="flex-1 sm:px-4"
                                >
                                    All
                                </Button>
                                <Button
                                    variant={(statusFilter === 'Active' ? 'secondary' : 'ghost') as any}
                                    size="sm"
                                    onClick={() => setStatusFilter('Active')}
                                    className="flex-1 sm:px-4 text-green-600"
                                >
                                    Active
                                </Button>
                                <Button
                                    variant={(statusFilter === 'Deactive' ? 'secondary' : 'ghost') as any}
                                    size="sm"
                                    onClick={() => setStatusFilter('Deactive')}
                                    className="flex-1 sm:px-4 text-red-600"
                                >
                                    Inactive
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l sm:pl-4 pt-4 sm:pt-0">
                                <Button variant={"outline" as any} size="sm" onClick={handleExportExcel} className="flex-1 sm:w-auto">
                                    <Download className="mr-2 h-4 w-4" />
                                    Excel
                                </Button>
                                <Button
                                    variant={"outline" as any}
                                    size="sm"
                                    onClick={() => handleBatchExportDocx('merged')}
                                    disabled={exporting || employees.length === 0}
                                    className="flex-1 sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                    {exporting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FileText className="mr-2 h-4 w-4" />
                                    )}
                                    Export All
                                </Button>
                                <Button
                                    variant={"outline" as any}
                                    size="sm"
                                    onClick={() => handleBatchExportDocx('spvr')}
                                    disabled={exporting || employees.length === 0}
                                    className="flex-1 sm:w-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    By SPVR
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Employee Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Employee Records</CardTitle>
                    <CardDescription>
                        {employees.length} employee{employees.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No employees found. Click "Add Employee" to create one.
                        </div>
                    ) : (
                        <div className="overflow-x-auto relative rounded-md border border-border/50">
                            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                                <table className="w-full">
                                    <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
                                        <tr className="border-b border-border">
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">ID</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Name</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Franchise</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Group</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Role</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Address</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">GPS</th>
                                            <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Status</th>
                                            {isAdmin && <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Code</th>}
                                            {isAdmin && <th className="text-left p-4 font-bold text-foreground text-xs uppercase tracking-wider">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((employee: Employee) => (
                                            <tr key={employee.id || employee.employeeId} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
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
                                                                variant={"ghost" as any}
                                                                size={"sm" as any}
                                                                onClick={() => showCode(employee, 'qr')}
                                                                title="View QR Code"
                                                            >
                                                                <QrCode className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant={"ghost" as any}
                                                                size={"sm" as any}
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
                                                                variant={"ghost" as any}
                                                                size={"sm" as any}
                                                                onClick={() => handleEdit(employee)}
                                                                title="Edit"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant={"ghost" as any}
                                                                size={"sm" as any}
                                                                onClick={() => { handleExportDocx(employee); }}
                                                                title="Download DOCX Report"
                                                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant={"ghost" as any}
                                                                size={"sm" as any}
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
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 border-t border-border/50 py-3 px-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Total active directory: <span className="font-bold text-foreground">{employees.length}</span> records</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                        Scroll down to see more records <ChevronRight className="w-3 h-3 rotate-90" />
                    </div>
                </CardFooter>
            </Card>

            {/* Employee Dialog */}
            <EmployeeDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                employee={editingEmployee}
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
                                    variant={(codeType === 'qr' ? 'secondary' : 'ghost') as any}
                                    size={"sm" as any}
                                    onClick={() => setCodeType('qr')}
                                    className="h-8"
                                >
                                    QR
                                </Button>
                                <Button
                                    variant={(codeType === 'barcode' ? 'secondary' : 'ghost') as any}
                                    size={"sm" as any}
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
                            <Button variant={"outline" as any} onClick={() => setQrDialogOpen(false)} className="flex-1">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

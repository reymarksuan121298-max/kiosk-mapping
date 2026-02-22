import { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { Loader2, Upload, Store, MapPin } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { employeeAPI, supervisorAPI, type Employee } from '@/lib/api';

interface EmployeeDialogProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    employee?: Employee | null;
}

const roles = ['Agent'];
const statuses = ['Active', 'Deactive'];
const franchises = [
    'Glowing Fortune Gaming OPC',
    'Imperial Gaming OPC',
    '5a Royal Gaming OPC'
];
const areas = ['LDN', 'BAL', 'ILI', 'LALA', 'SETB'];
const municipalities = ['BALO-I', 'ILIGAN', 'LALA'];

const getFranchisePrefix = (franchise: string) => {
    switch (franchise) {
        case 'Glowing Fortune Gaming OPC': return 'GF';
        case 'Imperial Gaming OPC': return 'IG';
        case '5a Royal Gaming OPC': return '5A';
        default: return 'ID';
    }
};

const generateFormattedId = (prefix: string, area: string, count: number) => {
    const sequence = (count + 1).toString().padStart(5, '0');
    return `${prefix}-${area}-${sequence}`;
};

export default function EmployeeDialog({ open, onClose, employee }: EmployeeDialogProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [supervisors, setSupervisors] = useState<{ id: string, name: string }[]>([]);
    const [formData, setFormData] = useState<Employee>({
        employeeId: '',
        fullName: '',
        spvr: '',
        role: 'Agent',
        address: '',
        latitude: undefined,
        longitude: undefined,
        franchise: franchises[0],
        status: 'Active',
        radiusMeters: 100,
    });

    useEffect(() => {
        const fetchSupervisors = async () => {
            try {
                const response = await supervisorAPI.getAll();
                setSupervisors(response.data.supervisors);
            } catch (err) {
                console.error('Failed to fetch supervisors:', err);
            }
        };

        if (open) {
            fetchSupervisors();
        }

        if (employee) {
            setFormData(employee);
            setPhotoPreview(employee.photoUrl || null);
            setScreenshotPreview(employee.coordinateScreenshotUrl || null);
        } else {
            // 1. Immediate fallback from localStorage
            const lastSpvr = localStorage.getItem('last_employee_spvr');
            const lastArea = localStorage.getItem('last_employee_area');
            const lastMunicipality = localStorage.getItem('last_employee_municipality');

            const initialArea = lastArea || areas[0];
            const initialFranchise = franchises[0];
            const prefix = getFranchisePrefix(initialFranchise);

            setFormData({
                employeeId: '...', // Loading state
                fullName: '',
                spvr: lastSpvr || '',
                role: 'Agent',
                address: '',
                latitude: undefined,
                longitude: undefined,
                franchise: initialFranchise,
                area: initialArea,
                municipality: lastMunicipality || '',
                status: 'Active',
                radiusMeters: 100,
            });

            // 2. Fetch area-specific count and latest data
            if (open) {
                const initNewEmployee = async () => {
                    try {
                        const [areaRes, lastEmpRes] = await Promise.all([
                            employeeAPI.getCountByArea(initialArea),
                            employeeAPI.getAll({ sortBy: 'created_at', sortOrder: 'desc' })
                        ]);

                        const areaCount = areaRes.data.count || 0;
                        const initialId = generateFormattedId(prefix, initialArea, areaCount);

                        const latest = lastEmpRes.data.employees?.[0];

                        setFormData(prev => ({
                            ...prev,
                            employeeId: initialId,
                            spvr: latest?.spvr || prev.spvr,
                            municipality: latest?.municipality || prev.municipality,
                        }));
                    } catch (err) {
                        console.error('Failed to initialize new employee ID:', err);
                    }
                };
                initNewEmployee();
            }
        }
        setError('');
        setPhotoPreview(null);
        setScreenshotPreview(null);
    }, [employee, open]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset and Preview
        setError('');
        setPhotoPreview(URL.createObjectURL(file));

        try {
            setUploading(true);
            const response = await employeeAPI.uploadPhoto(file);
            const uploadedUrl = response.data.photoUrl;

            // OCR Analysis
            setStatus('Extracting location data...');
            const result = await Tesseract.recognize(file, 'eng');
            const text = result.data.text;

            // 1. Try label-based matching (Lat: 7.123, Long: 123.123)
            const latRegex = /Lat(?:itude)?\s*[:=]?\s*(-?\d+[\.,]\d+)/i;
            const lngRegex = /(?:Long(?:itude)?|Lon|Lng)\s*[:=]?\s*(-?\d+[\.,]\d+)/i;

            const latMatch = text.match(latRegex);
            const lngMatch = text.match(lngRegex);

            let lat: number | null = null;
            let lng: number | null = null;

            if (latMatch && lngMatch) {
                lat = parseFloat(latMatch[1].replace(',', '.'));
                lng = parseFloat(lngMatch[1].replace(',', '.'));
            } else {
                // 2. Fallback: Find any numbers that look like PH coordinates (7.x and 123.x)
                const numbers = text.match(/-?\d+[\.,]\d+/g);
                if (numbers && numbers.length >= 2) {
                    const parsed = numbers.map(n => parseFloat(n.replace(',', '.')));
                    // PH Latitude is typically 4-20, Longitude is 116-127
                    const foundLat = parsed.find(n => n > 4 && n < 20);
                    const foundLng = parsed.find(n => n > 116 && n < 127);
                    if (foundLat && foundLng) {
                        lat = foundLat;
                        lng = foundLng;
                    }
                }
            }

            // 3. Detect Municipality and Area
            const foundMuni = municipalities.find(m => text.toUpperCase().includes(m.toUpperCase()));
            const foundArea = areas.find(a => text.toUpperCase().includes(a.toUpperCase()));

            // 4. Extract Address (usually lines containing common address words)
            const lines = text.split('\n');
            const addressLine = lines.find(line =>
                line.includes(',') &&
                (line.includes('Rd') || line.includes('St') || line.includes('Philippines') || line.includes('Brgy'))
            );

            let newId = formData.employeeId;
            if (foundArea && foundArea !== formData.area && !employee) {
                try {
                    const prefix = getFranchisePrefix(formData.franchise || franchises[0]);
                    const areaRes = await employeeAPI.getCountByArea(foundArea);
                    const areaCount = areaRes.data.count || 0;
                    newId = generateFormattedId(prefix, foundArea, areaCount);
                } catch (idErr) {
                    console.error('Failed to regenerate ID during OCR:', idErr);
                }
            }

            setFormData(prev => ({
                ...prev,
                photoUrl: uploadedUrl,
                employeeId: newId,
                latitude: lat ?? prev.latitude,
                longitude: lng ?? prev.longitude,
                municipality: foundMuni ?? prev.municipality,
                area: foundArea ?? prev.area,
                address: addressLine?.trim() ?? prev.address
            }));

            if (lat && lng) {
                setStatus('Location synced successfully!');
                setTimeout(() => setStatus(''), 2000);
            } else {
                setStatus('');
                setError('Coordinates not found in image. Please enter them manually.');
            }
        } catch (err: any) {
            setStatus('');
            setError('Failed to analyze image labels.');
        } finally {
            setUploading(false);
        }
    };

    const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setScreenshotPreview(URL.createObjectURL(file));

        try {
            setUploading(true);
            const response = await employeeAPI.uploadPhoto(file);
            const uploadedUrl = response.data.photoUrl;

            setFormData(prev => ({
                ...prev,
                coordinateScreenshotUrl: uploadedUrl
            }));
            setStatus('Screenshot uploaded successfully!');
            setTimeout(() => setStatus(''), 2000);
        } catch (err: any) {
            setError('Failed to upload screenshot.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (employee?.id) {
                await employeeAPI.update(employee.id, formData);
            } else {
                await employeeAPI.create(formData);
                // Save values for the next "Add" operation
                if (formData.spvr) localStorage.setItem('last_employee_spvr', formData.spvr);
                if (formData.area) localStorage.setItem('last_employee_area', formData.area);
                if (formData.municipality) {
                    localStorage.setItem('last_employee_municipality', formData.municipality);
                } else {
                    localStorage.removeItem('last_employee_municipality');
                }
            }
            onClose(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save employee');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = async (field: keyof Employee, value: any) => {
        setFormData((prev) => {
            const newData = { ...prev, [field]: value };
            return newData;
        });

        // Auto-generate ID if franchise or area changes and we're adding a new employee
        if ((field === 'franchise' || field === 'area') && !employee) {
            const currentFranchise = field === 'franchise' ? value : formData.franchise;
            const currentArea = field === 'area' ? value : formData.area;
            const prefix = getFranchisePrefix(currentFranchise);

            try {
                // Fetch count for the specific area
                const response = await employeeAPI.getCountByArea(currentArea);
                const areaCount = response.data.count || 0;

                // Generate ID with area-specific count
                const newId = generateFormattedId(prefix, currentArea, areaCount);

                setFormData((prev) => ({
                    ...prev,
                    employeeId: newId
                }));
            } catch (error) {
                console.error('Failed to fetch area count:', error);
            }
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
                setLoadingLocation(false);
                setError('');
            },
            (err) => {
                setError('Failed to get current location: ' + err.message);
                setLoadingLocation(false);
            },
            { enableHighAccuracy: true }
        );
    };

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                    <DialogDescription>
                        {employee ? 'Update employee information' : 'Create a new employee record'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    {status && (
                        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {status}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Employee ID */}
                        <div className="space-y-2">
                            <Label htmlFor="employeeId">Employee ID *</Label>
                            <Input
                                id="employeeId"
                                value={formData.employeeId}
                                onChange={(e) => handleChange('employeeId', e.target.value)}
                                required
                                className="font-mono h-10"
                            />
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name *</Label>
                            <Input
                                id="fullName"
                                value={formData.fullName}
                                onChange={(e) => handleChange('fullName', e.target.value)}
                                required
                                placeholder="e.g. John Doe"
                                autoComplete="name"
                                className="h-10"
                            />
                        </div>

                        {/* SPVR */}
                        <div className="space-y-2">
                            <Label htmlFor="spvr">SPVR *</Label>
                            <select
                                id="spvr"
                                value={formData.spvr || ''}
                                onChange={(e) => handleChange('spvr', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                <option value="" disabled>Select Supervisor</option>
                                {supervisors.map((s) => (
                                    <option key={s.id} value={s.name}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="role">Role *</Label>
                            <select
                                id="role"
                                value={formData.role}
                                onChange={(e) => handleChange('role', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Status *</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => handleChange('status', e.target.value as 'Active' | 'Deactive')}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                {statuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Franchise */}
                        <div className="space-y-2">
                            <Label htmlFor="franchise">Franchise *</Label>
                            <select
                                id="franchise"
                                value={formData.franchise}
                                onChange={(e) => handleChange('franchise', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                {franchises.map((franchise) => (
                                    <option key={franchise} value={franchise}>
                                        {franchise}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Area */}
                        <div className="space-y-2">
                            <Label htmlFor="area">Area *</Label>
                            <select
                                id="area"
                                value={formData.area || 'LDN'}
                                onChange={(e) => handleChange('area', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                required
                            >
                                {areas.map((area) => (
                                    <option key={area} value={area}>
                                        {area}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Municipality */}
                        <div className="space-y-2">
                            <Label htmlFor="municipality">Municipality (Optional)</Label>
                            <select
                                id="municipality"
                                value={formData.municipality || ''}
                                onChange={(e) => handleChange('municipality', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">None</option>
                                {municipalities.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Radius */}
                        <div className="space-y-2">
                            <Label htmlFor="radiusMeters">Allowed Radius (Meters)</Label>
                            <Input
                                id="radiusMeters"
                                type="number"
                                value={formData.radiusMeters || ''}
                                onChange={(e) => handleChange('radiusMeters', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="e.g. 100"
                                className="h-10"
                            />
                            <p className="text-[10px] text-muted-foreground">Default is 100 meters if left blank.</p>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                placeholder="e.g. 123 Main St, City, Country"
                                autoComplete="street-address"
                                className="h-10"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Photo Upload */}
                            <div className="space-y-2">
                                <Label>Kiosk Location Image</Label>
                                <div className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-border bg-accent/30 hover:bg-accent/50 transition-all group">
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-primary/20 bg-background flex items-center justify-center shadow-inner shrink-0">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Kiosk Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Store className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <h4 className="text-xs font-medium">Kiosk Photo</h4>
                                        <Button
                                            type="button"
                                            {...({ variant: "outline", size: "sm" } as any)}
                                            className="h-8 text-[10px] gap-1 px-3"
                                            onClick={() => document.getElementById('photo-upload')?.click()}
                                            disabled={uploading}
                                        >
                                            <Upload className="w-3 h-3" />
                                            {photoPreview ? 'Change' : 'Upload'}
                                        </Button>
                                        <input
                                            id="photo-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Coordinate Screenshot Upload */}
                            <div className="space-y-2">
                                <Label>Coordinate Screenshot</Label>
                                <div className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-border bg-accent/30 hover:bg-accent/50 transition-all group">
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-primary/20 bg-background flex items-center justify-center shadow-inner shrink-0">
                                        {screenshotPreview ? (
                                            <img src={screenshotPreview} alt="Screenshot Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                                        )}
                                        {uploading && (
                                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <h4 className="text-xs font-medium">GPS Screenshot</h4>
                                        <Button
                                            type="button"
                                            {...({ variant: "outline", size: "sm" } as any)}
                                            className="h-8 text-[10px] gap-1 px-3"
                                            onClick={() => document.getElementById('screenshot-upload')?.click()}
                                            disabled={uploading}
                                        >
                                            <Upload className="w-3 h-3" />
                                            {screenshotPreview ? 'Change' : 'Upload'}
                                        </Button>
                                        <input
                                            id="screenshot-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleScreenshotChange}
                                            disabled={uploading}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GPS Coordinates */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <Label className="text-sm font-semibold text-primary/80 uppercase tracking-wider">GPS Coordinates</Label>
                            <Button
                                type="button"
                                {...({ variant: "outline", size: "sm" } as any)}
                                className="h-9 gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-all active:scale-95 w-full sm:w-auto"
                                onClick={handleGetCurrentLocation}
                                disabled={loadingLocation}
                            >
                                {loadingLocation ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <MapPin className="w-3.5 h-3.5" />
                                )}
                                Use Current Location
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={formData.latitude || ''}
                                    onChange={(e) => handleChange('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="e.g. 14.5995"
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={formData.longitude || ''}
                                    onChange={(e) => handleChange('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="e.g. 120.9842"
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-6">
                        <Button
                            type="button"
                            {...({ variant: "outline" } as any)}
                            onClick={() => onClose()}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Employee'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

import { useState, useEffect } from 'react';
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
import { employeeAPI, type Employee } from '@/lib/api';

interface EmployeeDialogProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    employee?: Employee | null;
    totalCount?: number;
}

const roles = ['Agent'];
const statuses = ['Active', 'Deactive'];
const franchises = [
    'Glowing Fortune Gaming OPC',
    'Imperial Gaming OPC',
    '5a Royal Gaming OPC'
];
const areas = ['LDN', 'BAL', 'ILI', 'LALA', 'SETB'];

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

export default function EmployeeDialog({ open, onClose, employee, totalCount = 0 }: EmployeeDialogProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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
        if (employee) {
            setFormData(employee);
            setPhotoPreview(employee.photoUrl || null);
        } else {
            // Generate initial ID based on first franchise and default area
            const prefix = getFranchisePrefix(franchises[0]);
            const defaultArea = areas[0]; // 'LDN'
            const newId = generateFormattedId(prefix, defaultArea, totalCount);

            setFormData({
                employeeId: newId,
                fullName: '',
                spvr: 'SPVR-',
                role: 'Agent',
                address: '',
                latitude: undefined,
                longitude: undefined,
                franchise: franchises[0],
                area: defaultArea,
                status: 'Active',
                radiusMeters: 100,
            });
        }
        setError('');
        setPhotoPreview(null);
    }, [employee, open]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        try {
            setUploading(true);
            const response = await employeeAPI.uploadPhoto(file);
            handleChange('photoUrl', response.data.photoUrl);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload photo');
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
            const prefix = getFranchisePrefix(field === 'franchise' ? value : formData.franchise || franchises[0]);
            const area = field === 'area' ? value : formData.area || areas[0];

            try {
                // Fetch count for the specific area
                const response = await employeeAPI.getCountByArea(area);
                const areaCount = response.data.count || 0;

                // Generate ID with area-specific count
                const newId = generateFormattedId(prefix, area, areaCount);

                setFormData((prev) => ({
                    ...prev,
                    employeeId: newId
                }));
            } catch (error) {
                console.error('Failed to fetch area count:', error);
                // Fallback to totalCount if API call fails
                const newId = generateFormattedId(prefix, area, totalCount);
                setFormData((prev) => ({
                    ...prev,
                    employeeId: newId
                }));
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
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Employee ID */}
                        <div className="space-y-2">
                            <Label htmlFor="employeeId">Employee ID *</Label>
                            <Input
                                id="employeeId"
                                value={formData.employeeId}
                                onChange={(e) => handleChange('employeeId', e.target.value)}
                                required
                                className="font-mono"
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
                            />
                        </div>

                        {/* SPVR */}
                        <div className="space-y-2">
                            <Label htmlFor="spvr">SPVR</Label>
                            <Input
                                id="spvr"
                                value={formData.spvr}
                                onChange={(e) => handleChange('spvr', e.target.value)}
                                placeholder="e.g. SPVR-001"
                            />
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

                        {/* Radius */}
                        <div className="space-y-2">
                            <Label htmlFor="radiusMeters">Allowed Radius (Meters)</Label>
                            <Input
                                id="radiusMeters"
                                type="number"
                                value={formData.radiusMeters || ''}
                                onChange={(e) => handleChange('radiusMeters', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="e.g. 100"
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
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Kiosk Location Image</Label>
                            <div className="flex items-center gap-6 p-4 rounded-xl border border-dashed border-border bg-accent/30 hover:bg-accent/50 transition-all group">
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary/20 bg-background flex items-center justify-center shadow-inner">
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Kiosk Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Store className="w-10 h-10 text-muted-foreground" />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-2">
                                    <h4 className="text-sm font-medium">Upload Image</h4>
                                    <p className="text-xs text-muted-foreground">JPG, PNG or WEBP. Max 5MB.</p>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-2"
                                            onClick={() => document.getElementById('photo-upload')?.click()}
                                            disabled={uploading}
                                        >
                                            <Upload className="w-3.5 h-3.5" />
                                            {photoPreview ? 'Change Photo' : 'Choose File'}
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
                        </div>
                    </div>

                    {/* GPS Coordinates */}
                    <div className="space-y-4 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-primary/80 uppercase tracking-wider">GPS Coordinates</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-all active:scale-95"
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
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={formData.latitude || ''}
                                    onChange={(e) => handleChange('latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="e.g. 14.5995"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={formData.longitude || ''}
                                    onChange={(e) => handleChange('longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="e.g. 120.9842"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onClose()} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
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

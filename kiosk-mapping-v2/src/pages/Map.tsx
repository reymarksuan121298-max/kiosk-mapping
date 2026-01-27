import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup } from 'react-leaflet';
import { Maximize2, X, Clock, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { monitoringAPI, employeeAPI, type Employee } from '@/lib/api';
import L from 'leaflet';
import { cn } from '@/lib/utils';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const mapStyles = {
    street: {
        name: 'Street View',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
        name: 'Satellite View',
        url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution: '&copy; Google Maps'
    },
    dark: {
        name: 'Dark Mode',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
};

type MapStyle = keyof typeof mapStyles;

interface MapLocation {
    employee: Employee;
    scan_time?: string;
    remarks?: string;
    map_status: 'active' | 'today' | 'inactive' | 'pending';
}

const getMarkerIcon = (status: 'active' | 'today' | 'inactive' | 'pending') => {
    let color = '#3b82f6'; // Default Blue (Pending)
    let pulseClass = '';

    if (status === 'active') {
        color = '#10b981'; // Green
        pulseClass = 'marker-pulse-green';
    } else if (status === 'inactive') {
        color = '#ef4444'; // Red
        pulseClass = 'marker-pulse-red';
    } else if (status === 'today') {
        color = '#64748b'; // Grey
    }

    return L.divIcon({
        className: 'custom-marker',
        html: `<div class="${pulseClass}" style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
                transform: rotate(45deg);
            "></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });
};

export default function MapPage() {
    const [locations, setLocations] = useState<MapLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapStyle, setMapStyle] = useState<MapStyle>('satellite');
    const [viewImage, setViewImage] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Live refresh
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            // Fetch both Employees (the base) and Scans (the status)
            const [empRes, scanRes] = await Promise.all([
                employeeAPI.getAll({ status: 'Active' }),
                monitoringAPI.getDailyMap()
            ]);

            const employees = empRes.data.employees;
            const scans = scanRes.data.locations; // Array of scan records

            // Create a map of scans for quick lookup
            const scanMap = new Map();
            scans.forEach((scan: any) => {
                scanMap.set(scan.employee_id, scan);
            });

            // Merge data
            const mergedLocations: MapLocation[] = employees
                .filter((emp: Employee) => emp.latitude && emp.longitude)
                .map((emp: Employee) => {
                    const scan = scanMap.get(emp.id);

                    let status: MapLocation['map_status'] = 'pending';
                    if (scan) {
                        status = scan.map_status;
                    }

                    return {
                        employee: emp,
                        scan_time: scan ? scan.scan_time : undefined,
                        remarks: scan ? scan.remarks : undefined,
                        map_status: status
                    };
                });

            setLocations(mergedLocations);
        } catch (error) {
            console.error('Failed to load map data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Center map on the first active/pending location or default
    const center: [number, number] = locations.length > 0 && locations[0].employee.latitude && locations[0].employee.longitude
        ? [locations[0].employee.latitude!, locations[0].employee.longitude!]
        : [14.5995, 120.9842]; // Default to Manila

    const activeCount = locations.filter(l => l.map_status === 'active').length;
    const inactiveCount = locations.filter(l => l.map_status === 'inactive').length;
    const pendingCount = locations.filter(l => l.map_status === 'pending').length;
    const todayCount = locations.filter(l => l.scan_time).length;

    return (
        <div className="p-8 space-y-6">
            <style>{`
                @keyframes pulse-green {
                    0% {
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                        transform: rotate(-45deg) scale(1);
                    }
                    50% {
                        transform: rotate(-45deg) scale(1.15);
                        opacity: 0.9;
                    }
                    100% {
                        box-shadow: 0 0 0 15px rgba(16, 185, 129, 0);
                        transform: rotate(-45deg) scale(1);
                    }
                }
                .marker-pulse-green { animation: pulse-green 1.5s infinite ease-in-out; }
                
                @keyframes pulse-red {
                    0% {
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                        transform: rotate(-45deg) scale(1);
                    }
                    50% {
                        transform: rotate(-45deg) scale(1.15);
                        opacity: 0.9;
                    }
                    100% {
                        box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
                        transform: rotate(-45deg) scale(1);
                    }
                }
                .marker-pulse-red { animation: pulse-red 1.5s infinite ease-in-out; }
            `}</style>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Kiosk Operations Map</h1>
                    <p className="text-muted-foreground mt-2">
                        Live status of all registered active kiosks
                    </p>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                    <label className="text-sm font-medium text-muted-foreground ml-1">Map Style</label>
                    <select
                        value={mapStyle}
                        onChange={(e) => setMapStyle(e.target.value as MapStyle)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {Object.entries(mapStyles).map(([key, style]) => (
                            <option key={key} value={key}>{style.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Map Card */}
            <Card className="border-border/50 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle>Field Overview</CardTitle>
                        <CardDescription>
                            {activeCount} active • {inactiveCount} no bot • {pendingCount} pending • {todayCount} processed today
                        </CardDescription>
                    </div>
                    <div className="flex gap-4 text-xs md:text-sm font-medium flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                            <span>No Bot</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                            <span>Visited</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span>Pending</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="h-[650px] flex items-center justify-center text-muted-foreground">
                            Loading map data...
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="h-[650px] flex items-center justify-center text-muted-foreground bg-muted/20">
                            No kiosks found with GPS coordinates.
                        </div>
                    ) : (
                        <div className="h-[650px] relative">
                            <MapContainer
                                center={center}
                                zoom={12}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution={mapStyles[mapStyle].attribution}
                                    url={mapStyles[mapStyle].url}
                                />
                                {locations.map((loc) => (
                                    <LayerGroup key={loc.employee.id}>
                                        <Circle
                                            center={[loc.employee.latitude!, loc.employee.longitude!]}
                                            radius={80}
                                            pathOptions={{
                                                color: loc.map_status === 'active' ? '#10b981' : (loc.map_status === 'inactive' ? '#ef4444' : (loc.map_status === 'pending' ? '#3b82f6' : '#64748b')),
                                                fillColor: loc.map_status === 'active' ? '#10b981' : (loc.map_status === 'inactive' ? '#ef4444' : (loc.map_status === 'pending' ? '#3b82f6' : '#64748b')),
                                                fillOpacity: 0.1,
                                                weight: 1,
                                                dashArray: (loc.map_status === 'active' || loc.map_status === 'inactive') ? undefined : '5,5'
                                            }}
                                        />
                                        <Marker
                                            position={[loc.employee.latitude!, loc.employee.longitude!]}
                                            icon={getMarkerIcon(loc.map_status)}
                                        >
                                            <Popup>
                                                <div className="p-1 min-w-[240px]">
                                                    {loc.employee.photoUrl && (
                                                        <div
                                                            className="w-full h-40 mb-3 rounded-xl overflow-hidden border border-border group relative cursor-pointer shadow-sm"
                                                            onClick={() => setViewImage(loc.employee.photoUrl!)}
                                                        >
                                                            <img
                                                                src={loc.employee.photoUrl}
                                                                alt="Kiosk Photo"
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Maximize2 className="w-6 h-6 text-white" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-start justify-between mb-2">
                                                        <div>
                                                            <h3 className="font-black text-lg leading-tight">{loc.employee.fullName}</h3>
                                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                                                                <Shield className="w-3 h-3" />
                                                                ID: {loc.employee.employeeId}
                                                            </div>
                                                        </div>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                                            loc.map_status === 'active'
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                                : (loc.map_status === 'inactive'
                                                                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                                                    : (loc.map_status === 'pending'
                                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                                                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"))
                                                        )}>
                                                            {loc.map_status.toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                                        <div className="bg-accent/50 p-2 rounded-lg border border-border/50">
                                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Role</p>
                                                            <p className="text-xs font-semibold">{loc.employee.role}</p>
                                                        </div>
                                                        <div className="bg-accent/50 p-2 rounded-lg border border-border/50">
                                                            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Franchise</p>
                                                            <p className="text-xs font-semibold">{loc.employee.franchise}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-xs font-mono text-muted-foreground flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-border/50">
                                                        <Clock className="w-3.5 h-3.5 text-primary" />
                                                        <span>
                                                            {loc.scan_time
                                                                ? `Last Scan: ${new Date(loc.scan_time).toLocaleTimeString()} `
                                                                : 'No scans today'}
                                                        </span>
                                                    </div>

                                                    {loc.remarks && (
                                                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30">
                                                            <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-black mb-1 tracking-tighter">Field Remarks</p>
                                                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 italic leading-tight">"{loc.remarks}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </LayerGroup>
                                ))}
                            </MapContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Image Lightbox */}
            {viewImage && (
                <div
                    className="fixed inset-0 z-[5000] bg-black/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300"
                    onClick={() => setViewImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors z-[5001]"
                        onClick={() => setViewImage(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <div
                        className="relative max-w-5xl w-full max-h-full rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={viewImage}
                            alt="Full View"
                            className="max-w-full max-h-[85vh] mx-auto object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

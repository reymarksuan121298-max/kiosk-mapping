import { useState, useEffect } from 'react';
import { Activity, Clock, UserCheck, Shield, Send, X, Navigation, RefreshCcw, AlertTriangle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { monitoringAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OnDutyRecord {
    id: string;
    employee_id: string;
    scan_time: string;
    status: string;
    latitude: number;
    longitude: number;
    distance_meters: number;
    alert_type: string;
    remarks?: string;
    employees: {
        id: string;
        employee_id: string;
        full_name: string;
        role: string;
        franchise: string;
        spvr: string;
        photo_url: string;
        latitude?: number;
        longitude?: number;
    };
}

// Custom Marker Icons for Enhanced Visualization
const scanIcon = L.divIcon({
    className: 'scan-marker',
    html: `<div class="w-8 h-8 relative flex items-center justify-center">
        <div class="absolute inset-0 bg-primary opacity-20 rounded-full animate-ping"></div>
        <div class="w-6 h-6 bg-primary rounded-full border-2 border-white shadow-xl flex items-center justify-center">
            <div class="w-2 h-2 bg-white rounded-full"></div>
        </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

const kioskIcon = L.divIcon({
    className: 'kiosk-marker',
    html: `<div class="w-8 h-8 bg-slate-900 rounded-lg border-2 border-white shadow-xl flex items-center justify-center">
        <div class="w-3 h-3 bg-white rounded-sm"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

export default function MonitoringPage() {
    const [onDuty, setOnDuty] = useState<OnDutyRecord[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanId, setScanId] = useState('');
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<OnDutyRecord | null>(null);
    const [mapOpen, setMapOpen] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [testStatus, setTestStatus] = useState<'Active' | 'Inactive'>('Active');
    const [testRemarks, setTestRemarks] = useState('');

    useEffect(() => {
        loadData();
        let interval: any;
        if (autoRefresh) {
            interval = setInterval(loadData, 30000); // refresh every 30s
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    const loadData = async () => {
        try {
            const [onDutyRes, historyRes] = await Promise.all([
                monitoringAPI.getOnDuty(),
                monitoringAPI.getHistory({ limit: 10 })
            ]);
            setOnDuty(onDutyRes.data.onDuty);
            setHistory(historyRes.data.history);
        } catch (err) {
            console.error('Failed to load monitoring data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMockScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanId) return;

        setError('');
        setSuccess('');
        setScanning(true);

        try {
            let lat: number | undefined = undefined;
            let lon: number | undefined = undefined;

            // Optional: Request real geolocation from browser
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                });
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
            } catch (geoErr) {
                // If geoloc fails, we send undefined which the backend now handles 
                // by defaulting to the employee's assigned kiosk location.
                console.log('No GPS detected, defaulting to employee post location');
            }

            const res = await monitoringAPI.scan({
                employeeId: scanId,
                latitude: lat,
                longitude: lon,
                status: testStatus,
                remarks: testRemarks || undefined
            });

            setSuccess(`Scanned: ${res.data.employee.full_name}`);
            setScanId('');
            setTestRemarks('');
            loadData();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to record scan');
        } finally {
            setScanning(false);
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                        <Activity className="h-5 w-5 animate-pulse" />
                        <span className="text-sm font-bold tracking-widest uppercase">Live Monitoring</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Kiosk Attendance</h1>
                    <p className="text-muted-foreground">
                        Real-time tracking of employees currently on duty at kiosks.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-card border rounded-lg px-4 py-2 flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Auto-Refresh</span>
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={cn(
                                "w-10 h-5 rounded-full relative transition-colors duration-300",
                                autoRefresh ? "bg-primary" : "bg-slate-300"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300",
                                autoRefresh ? "left-6" : "left-1"
                            )} />
                        </button>
                    </div>
                    <Button variant="outline" size="icon" onClick={loadData} className={cn(loading && "animate-spin")}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-green-500" />
                        Active Sessions
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs">
                            {onDuty.length}
                        </span>
                    </h2>

                    {loading && onDuty.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
                        </div>
                    ) : onDuty.length === 0 ? (
                        <Card className="bg-muted/30 border-dashed py-16 text-center text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">No active connections</p>
                            <p className="text-sm">Wait for employees to scan their QR codes at kiosks.</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {onDuty.map((record) => {
                                const isInactive = record.status === 'Inactive';
                                return (
                                    <Card key={record.id} className={cn(
                                        "group overflow-hidden border-2 transition-all hover:shadow-xl",
                                        isInactive
                                            ? "border-slate-300 bg-slate-100/50 grayscale-[0.5]"
                                            : (record.alert_type ? "border-red-500 shadow-red-500/5 bg-red-50/10" : "border-transparent hover:border-primary/50")
                                    )}>
                                        <div className="flex p-5 gap-4">
                                            <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-border/50 bg-muted shadow-inner">
                                                {record.employees.photo_url ? (
                                                    <img src={record.employees.photo_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-black">
                                                        {record.employees.full_name[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div>
                                                    <h4 className="font-black text-lg truncate leading-tight group-hover:text-primary transition-colors">
                                                        {record.employees.full_name}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground font-mono font-bold">{record.employees.employee_id}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className="text-[10px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{record.employees.role}</span>
                                                    <span className="text-[10px] bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{record.employees.franchise}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {isInactive ? (
                                                        <div className="inline-flex items-center gap-1.5 bg-slate-600 text-white px-2 py-1 rounded-lg font-black text-[10px] uppercase">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            NO BOT ON DUTY
                                                        </div>
                                                    ) : record.alert_type && (
                                                        <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 px-2 py-1 rounded-lg font-black text-[10px] uppercase animate-pulse">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            {record.alert_type}
                                                        </div>
                                                    )}
                                                    {!isInactive && !record.alert_type && (
                                                        <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg font-black text-[10px] uppercase">
                                                            <UserCheck className="h-3 w-3" />
                                                            ACTIVE
                                                        </div>
                                                    )}
                                                </div>
                                                {record.remarks && (
                                                    <div className="mt-2 text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-border/50">
                                                        <span className="font-bold text-muted-foreground uppercase text-[9px] block mb-1">Remarks:</span>
                                                        <p className="italic text-slate-700 dark:text-slate-300">"{record.remarks}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="px-5 py-4 space-y-3 bg-slate-50/80 dark:bg-slate-900/50 border-t border-border/50">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase tracking-tighter">
                                                    <Clock className="h-4 w-4" />
                                                    {isInactive ? 'History: ' : 'Active from '}{formatTime(record.scan_time)}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedRecord(record);
                                                        setMapOpen(true);
                                                    }}
                                                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-black uppercase tracking-tighter transition-all hover:scale-105"
                                                >
                                                    <Navigation className="h-4 w-4" />
                                                    Live Map
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-border/50">
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Scan Loc</p>
                                                    <p className="text-[10px] font-mono font-bold">{record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}</p>
                                                </div>
                                                <div className={cn(
                                                    "p-2 rounded-xl border",
                                                    record.alert_type ? "bg-red-50 border-red-200 text-red-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                                                )}>
                                                    <p className="text-[9px] font-bold uppercase opacity-70">Variance</p>
                                                    <p className="text-[10px] font-mono font-bold">{record.distance_meters} Meters</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Monitoring Lab (Test Scan)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={handleMockScan} className="flex gap-2">
                                <Input
                                    placeholder="Enter Employee ID..."
                                    value={scanId}
                                    onChange={(e) => setScanId(e.target.value)}
                                    disabled={scanning}
                                    className="bg-background border-primary/20"
                                />
                                <Button type="submit" size="icon" disabled={scanning || !scanId} className="bg-primary hover:bg-primary/90">
                                    <Send className={cn("h-4 w-4", scanning && "animate-spin")} />
                                </Button>
                            </form>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between bg-background border rounded-lg p-2">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Mock Status</span>
                                    <div className="flex bg-muted rounded-md p-1 h-8">
                                        <button
                                            type="button"
                                            onClick={() => setTestStatus('Active')}
                                            className={cn("px-3 text-[10px] font-bold rounded transition-all", testStatus === 'Active' ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground")}
                                        >ACTIVE</button>
                                        <button
                                            type="button"
                                            onClick={() => setTestStatus('Inactive')}
                                            className={cn("px-3 text-[10px] font-bold rounded transition-all", testStatus === 'Inactive' ? "bg-slate-600 text-white shadow-sm" : "text-muted-foreground")}
                                        >INACTIVE</button>
                                    </div>
                                </div>
                                {testStatus === 'Inactive' && (
                                    <Input
                                        placeholder="Add inactive remarks..."
                                        value={testRemarks}
                                        onChange={(e) => setTestRemarks(e.target.value)}
                                        className="text-xs h-8 border-dashed"
                                    />
                                )}
                            </div>
                            {error && <div className="p-3 bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>}
                            {success && <div className="p-3 bg-green-100 text-green-600 rounded-lg text-xs font-bold flex items-center gap-2"><UserCheck className="h-4 w-4" />{success}</div>}
                        </CardContent>
                    </Card>

                    <h2 className="text-xl font-bold flex items-center gap-2 px-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Activity Feed
                    </h2>
                    <Card className="h-[calc(100vh-420px)] overflow-hidden flex flex-col border-border/50 shadow-lg">
                        <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                            {history.length === 0 ? (
                                <div className="py-20 text-center text-muted-foreground text-xs font-mono uppercase tracking-[0.3em] opacity-40">Standby</div>
                            ) : (
                                <div className="divide-y divide-border/50">
                                    {history.map((h, i) => (
                                        <div key={h.id} className={cn(
                                            "p-4 flex gap-4 transition-all duration-300",
                                            h.alert_type ? "bg-red-500/[0.03] hover:bg-red-500/[0.06]" : (i === 0 ? "bg-primary/[0.03] hover:bg-primary/[0.06]" : "hover:bg-muted/50")
                                        )}>
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                                                h.alert_type ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary border border-primary/20"
                                            )}>
                                                <Activity className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-black text-sm truncate tracking-tight">{h.employees?.full_name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">{formatTime(h.scan_time)}</span>
                                                </div>
                                                <p className={cn(
                                                    "text-[11px] font-medium leading-relaxed",
                                                    h.alert_type ? "text-red-600" : "text-muted-foreground"
                                                )}>
                                                    {h.alert_type ? `Detected: ${h.alert_type}` : (h.status === 'Inactive' ? 'Marked as Inactive' : 'Authorized session start')}
                                                </p>
                                                {h.remarks && (
                                                    <p className="text-[10px] italic text-muted-foreground mt-1 bg-muted/50 p-1.5 rounded">
                                                        "{h.remarks}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Location Viewer Dialog */}
            {mapOpen && selectedRecord && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="bg-card w-full max-w-5xl rounded-[2.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-500">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-border/50 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden border-2 border-primary/20 shadow-2xl">
                                    {selectedRecord.employees.photo_url ? (
                                        <img src={selectedRecord.employees.photo_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-black">
                                            {selectedRecord.employees.full_name[0]}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-black text-3xl tracking-tighter leading-none">{selectedRecord.employees.full_name}</h3>
                                        {selectedRecord.alert_type ? (
                                            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Alert</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Verified</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest">{selectedRecord.employees.role}</span>
                                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 font-bold">
                                            <Clock className="h-3.5 w-3.5" /> SECURED AT {formatTime(selectedRecord.scan_time)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-2xl h-14 w-14 hover:bg-primary/10 transition-all active:scale-95 border" onClick={() => setMapOpen(false)}>
                                <X className="h-7 w-7" />
                            </Button>
                        </div>

                        {/* Modal Content / Map */}
                        <div className="h-[580px] relative">
                            <MapContainer
                                center={[selectedRecord.latitude, selectedRecord.longitude]}
                                zoom={16}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer
                                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                    attribution="&copy; Google Maps"
                                />

                                <Marker position={[selectedRecord.latitude, selectedRecord.longitude]} icon={scanIcon}>
                                    <Popup className="custom-popup">
                                        <div className="p-2 font-black text-center">
                                            <p className="text-primary uppercase tracking-tighter mb-1">Live Scan Activity</p>
                                            <div className="text-[10px] text-muted-foreground bg-slate-50 p-1 rounded font-mono mb-2">
                                                {selectedRecord.latitude.toFixed(6)}, {selectedRecord.longitude.toFixed(6)}
                                            </div>
                                            {selectedRecord.employees.photo_url && (
                                                <div className="mt-2 w-full h-32 rounded-lg overflow-hidden border border-slate-200">
                                                    <img src={selectedRecord.employees.photo_url} className="w-full h-full object-cover" alt="Station Preset" />
                                                </div>
                                            )}
                                            {selectedRecord.remarks && (
                                                <div className="mt-2 p-2 bg-slate-100 rounded-lg border border-border/50">
                                                    <p className="text-[9px] text-muted-foreground uppercase font-bold text-left mb-1">Remarks:</p>
                                                    <p className="text-[11px] font-medium text-slate-700 italic leading-tight text-left">"{selectedRecord.remarks}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>

                                {selectedRecord.employees.latitude && selectedRecord.employees.longitude && (
                                    <>
                                        <Marker
                                            position={[selectedRecord.employees.latitude, selectedRecord.employees.longitude]}
                                            icon={kioskIcon}
                                        >
                                            <Popup>
                                                <div className="p-1 font-black">
                                                    <p className="uppercase tracking-tighter text-slate-800">Assigned Post</p>
                                                    {selectedRecord.employees.photo_url && (
                                                        <div className="my-2 w-32 h-24 rounded border overflow-hidden">
                                                            <img src={selectedRecord.employees.photo_url} className="w-full h-full object-cover" alt="Target Station" />
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] text-muted-foreground">Coordinates Verified</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                        <Polyline
                                            positions={[
                                                [selectedRecord.latitude, selectedRecord.longitude],
                                                [selectedRecord.employees.latitude, selectedRecord.employees.longitude]
                                            ]}
                                            pathOptions={{
                                                color: selectedRecord.alert_type ? '#f43f5e' : '#34d399',
                                                weight: 5,
                                                dashArray: '12, 16',
                                                lineCap: 'round',
                                                opacity: 0.8
                                            }}
                                        />
                                        <Circle
                                            center={[selectedRecord.employees.latitude, selectedRecord.employees.longitude]}
                                            radius={200}
                                            pathOptions={{
                                                color: '#10b981',
                                                fillColor: '#10b981',
                                                fillOpacity: 0.08,
                                                weight: 2,
                                                dashArray: '10, 10'
                                            }}
                                        />
                                    </>
                                )}
                            </MapContainer>

                            {/* Map Floating Legend */}
                            <div className="absolute top-8 left-8 z-[1000] space-y-4 pointer-events-none">
                                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 pointer-events-auto">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">Tactical Legend</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] border-2 border-white"></div>
                                            <span className="text-[11px] font-black uppercase">Detection Point</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-4 h-4 bg-slate-900 dark:bg-white rounded-lg border-2 border-slate-300"></div>
                                            <span className="text-[11px] font-black uppercase">Assigned Hub</span>
                                        </div>
                                        <div className="flex items-center gap-4 opacity-60">
                                            <div className="w-8 h-1 bg-primary rounded-full"></div>
                                            <span className="text-[11px] font-black uppercase">Vector Line</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedRecord.alert_type && (
                                    <div className="bg-red-600 text-white p-6 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce pointer-events-auto border-2 border-white/20">
                                        <AlertTriangle className="h-8 w-8" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Variance Breach</p>
                                            <p className="text-xl font-black">OUTSIDE RADIUS</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-8 border-t border-border/10">
                            <div className="flex items-center gap-6">
                                <div className={cn(
                                    "px-7 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-4 transition-all duration-500",
                                    selectedRecord.alert_type
                                        ? "bg-red-600 text-white shadow-red-600/30 scale-105"
                                        : "bg-emerald-600 text-white shadow-emerald-600/30"
                                )}>
                                    <Shield className="h-8 w-8" />
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80 mb-0.5">Integrity Analysis</p>
                                        <p className="text-2xl font-black italic tracking-tighter">
                                            {selectedRecord.alert_type ? 'SECURITY BREACH' : 'AUTHENTIC SCAN'}
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-900 px-7 py-4 rounded-[1.5rem] border border-border/50">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Calculated Distance</p>
                                    <p className="text-2xl font-black font-mono">{selectedRecord.distance_meters}m Variance</p>
                                </div>
                            </div>
                            <Button size="lg" className="rounded-2xl px-16 h-16 font-black text-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xl transform transition-all active:scale-95" onClick={() => setMapOpen(false)}>
                                CLOSE TACTICAL VIEW
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

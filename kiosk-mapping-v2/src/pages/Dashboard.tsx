import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, MapPin, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { employeeAPI } from '@/lib/api';

interface Stats {
    total: number;
    active: number;
    inactive: number;
    withGPS: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats>({
        total: 0,
        active: 0,
        inactive: 0,
        withGPS: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await employeeAPI.getStats();
            setStats(res.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Employees',
            value: stats.total,
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: 'Active',
            value: stats.active,
            icon: UserCheck,
            color: 'from-green-500 to-emerald-500',
            bgColor: 'bg-green-500/10',
        },
        {
            title: 'Inactive',
            value: stats.inactive,
            icon: UserX,
            color: 'from-red-500 to-rose-500',
            bgColor: 'bg-red-500/10',
        },
        {
            title: 'With GPS Location',
            value: stats.withGPS,
            icon: MapPin,
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Employee management system overview
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <Card key={stat.title} className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`w-5 h-5 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {loading ? '...' : stat.value}
                            </div>
                        </CardContent>
                        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`} />
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Common tasks and shortcuts
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <button
                        onClick={() => window.location.href = '/dashboard/employees'}
                        className="p-6 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                        <Users className="w-8 h-8 text-primary mb-3" />
                        <h3 className="font-semibold mb-1">Manage Employees</h3>
                        <p className="text-sm text-muted-foreground">
                            Add, edit, or remove employee records
                        </p>
                    </button>

                    <button
                        onClick={() => window.location.href = '/dashboard/map'}
                        className="p-6 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                        <MapPin className="w-8 h-8 text-primary mb-3" />
                        <h3 className="font-semibold mb-1">View Map</h3>
                        <p className="text-sm text-muted-foreground">
                            See employee locations on interactive map
                        </p>
                    </button>

                    <button
                        onClick={() => window.location.href = '/dashboard/audit'}
                        className="p-6 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                        <FileText className="w-8 h-8 text-primary mb-3" />
                        <h3 className="font-semibold mb-1">Audit Logs</h3>
                        <p className="text-sm text-muted-foreground">
                            Track all system changes and activities
                        </p>
                    </button>
                </CardContent>
            </Card>

        </div>
    );
}

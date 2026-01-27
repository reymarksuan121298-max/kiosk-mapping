import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Users, Map, LogOut, LayoutDashboard, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', href: '/dashboard/employees', icon: Users },
    { name: 'Map View', href: '/dashboard/map', icon: Map },
    { name: 'Attendance', href: '/dashboard/attendance', icon: Clock },
    { name: 'Audit Logs', href: '/dashboard/audit', icon: FileText },
];

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-border bg-card/50 backdrop-blur-xl">
                <div className="flex h-full flex-col">
                    {/* Logo */}
                    <div className="flex h-16 items-center gap-3 border-b border-border px-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <MapPin className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                MAPPING
                            </h1>
                            <p className="text-xs text-muted-foreground">v2.0</p>
                        </div>
                        <ModeToggle />
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-4">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => navigate(item.href)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-primary/10 text-primary shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="border-t border-border p-4 space-y-3">
                        <div className="px-4 py-2 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Signed in as</p>
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="ml-64 min-h-screen flex flex-col">
                <div className="flex-1">
                    <Outlet />
                </div>
                <footer className="p-6 border-t border-border flex flex-col items-center gap-2 bg-card/30">
                    <p className="text-xs font-medium text-muted-foreground tracking-[0.2em] uppercase">
                        Developed By <span className="text-primary font-bold">REYMARK SUAN</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-mono">
                        © 2026 KIOSK MAPPING . ALL RIGHTS RESERVED
                    </p>
                </footer>
            </main>
        </div>
    );
}

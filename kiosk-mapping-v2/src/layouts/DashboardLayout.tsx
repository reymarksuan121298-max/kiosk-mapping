import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Users, Map, LogOut, LayoutDashboard, FileText, Clock, Menu, X } from 'lucide-react';
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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    // Close sidebar when navigating on mobile
    useEffect(() => {
        setSidebarOpen(false);
    }, [location]);

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h1 className="text-base font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        MAPPING
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                </div>
            </header>

            {/* Sidebar / Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all md:hidden",
                    sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setSidebarOpen(false)}
            />

            <aside className={cn(
                "fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card/50 backdrop-blur-xl transition-all duration-300 md:translate-x-0 md:bg-card/50",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-full flex-col">
                    {/* Logo & Close Button */}
                    <div className="flex h-16 items-center border-b border-border px-6">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <MapPin className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                    MAPPING
                                </h1>
                                <p className="text-xs text-muted-foreground">v2.0</p>
                            </div>
                        </div>
                        <div className="md:hidden">
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="hidden md:block">
                            <ModeToggle />
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => navigate(item.href)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left',
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
                            <p className="text-xs text-muted-foreground font-medium">User Account</p>
                            <p className="text-sm font-semibold truncate leading-tight mt-0.5">{user?.email}</p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-3 border-destructive/20 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col min-h-screen md:ml-64 transition-all">
                <div className="flex-1">
                    <Outlet />
                </div>
                <footer className="p-6 border-t border-border flex flex-col items-center gap-3 bg-card/30">
                    <p className="text-[10px] font-bold text-muted-foreground tracking-[0.3em] uppercase opacity-70">
                        Developed By <span className="text-primary">REYMARK SUAN</span>
                    </p>
                    <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.4em] font-mono text-center">
                        © 2026 KIOSK MAPPING • ALL RIGHTS RESERVED
                    </p>
                </footer>
            </main>
        </div>
    );
}

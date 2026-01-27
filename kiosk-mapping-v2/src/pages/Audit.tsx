import { useEffect, useState } from 'react';
import { FileText, User, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auditAPI } from '@/lib/api';

interface AuditLog {
    id: string;
    action: string;
    table_name: string;
    created_at: string;
    users?: {
        email: string;
        full_name: string;
    };
    changes?: any;
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [user] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            const response = await auditAPI.getLogs({ limit: 100 });
            setLogs(response.data.logs);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearLogs = async () => {
        if (!confirm('Are you sure you want to clear all audit logs? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            await auditAPI.clearLogs();
            setLogs([]);
        } catch (error) {
            console.error('Failed to clear audit logs:', error);
            alert('Failed to clear audit logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE':
                return 'bg-green-500/10 text-green-500';
            case 'UPDATE':
                return 'bg-blue-500/10 text-blue-500';
            case 'DELETE':
                return 'bg-red-500/10 text-red-500';
            default:
                return 'bg-gray-500/10 text-gray-500';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground mt-2">
                        Track all system changes and activities
                    </p>
                </div>

                {logs.length > 0 && isAdmin && (
                    <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={handleClearLogs}
                        disabled={loading}
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear All Logs
                    </Button>
                )}
            </div>

            {/* Audit Logs */}
            <Card>
                <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>
                        {logs.length} log entr{logs.length !== 1 ? 'ies' : 'y'} found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No audit logs found
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <FileText className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span
                                                        className={`px-2 py-1 rounded-md text-xs font-medium ${getActionColor(
                                                            log.action
                                                        )}`}
                                                    >
                                                        {log.action}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        on {log.table_name}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {log.users?.full_name || 'System'}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(log.created_at)}
                                                    </div>
                                                </div>
                                                {log.changes && (
                                                    <details className="mt-2">
                                                        <summary className="text-xs text-primary cursor-pointer hover:underline">
                                                            View changes
                                                        </summary>
                                                        <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-x-auto">
                                                            {JSON.stringify(log.changes, null, 2)}
                                                        </pre>
                                                    </details>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

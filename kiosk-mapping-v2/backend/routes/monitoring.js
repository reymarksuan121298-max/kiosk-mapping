const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Helper to calculate distance in meters between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}

// Record a new scan (Clock-in / On Duty)
router.post('/scan', async (req, res) => {
    try {
        const { employeeId, latitude, longitude, status, remarks } = req.body;

        console.log('--- SCAN REQUEST RECEIVED ---');
        console.log('Payload:', req.body);

        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }

        // Clean the ID (remove potential whitespace)
        const cleanId = employeeId.trim();
        console.log(`Searching for Employee ID: "${cleanId}"`);

        // Find the employee by their custom employeeId (from QR)
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, full_name, employee_id, latitude, longitude, radius_meters, role, franchise, area, spvr')
            .eq('employee_id', cleanId);

        if (empError) {
            console.error('Database Error finding employee:', empError);
            return res.status(500).json({ error: 'Database error: ' + empError.message });
        }

        console.log(`Query returned ${employees?.length || 0} results`);

        if (!employees || employees.length === 0) {
            console.log('❌ Employee NOT found in DB');
            console.log('Attempted ID:', cleanId);

            // Try to find similar IDs for debugging
            const { data: allIds } = await supabase
                .from('employees')
                .select('employee_id')
                .limit(5);

            console.log('Sample IDs in database:', allIds?.map(e => e.employee_id));

            return res.status(404).json({
                error: `Employee not found: ${cleanId}`,
                hint: 'Check if the employee ID format matches the database'
            });
        }

        const employee = employees[0];
        console.log('✅ Employee FOUND:', employee.full_name, `(${employee.employee_id})`);

        // Calculate distance if coordinates provided
        let distance = null;
        let alertType = null;
        let finalLat = latitude;
        let finalLon = longitude;
        const ALERT_THRESHOLD = 200; // 200 meters

        if (latitude && longitude && employee.latitude && employee.longitude) {
            distance = calculateDistance(
                parseFloat(latitude),
                parseFloat(longitude),
                parseFloat(employee.latitude),
                parseFloat(employee.longitude)
            );

            const allowedRadius = employee.radius_meters || 200;

            if (distance > allowedRadius) {
                console.log(`❌ Geofence Breach: ${distance}m (Allowed: ${allowedRadius}m)`);
                return res.status(403).json({
                    error: "Your out of range on your registered coordinates",
                    distance: distance,
                    allowedRadius: allowedRadius
                });
            }
        } else if (!latitude || !longitude) {
            return res.status(400).json({ error: 'GPS coordinates are required for verification' });
        } else if (!employee.latitude || !employee.longitude) {
            return res.status(400).json({ error: 'No registered coordinates found for this kiosk. Please contact admin.' });
        }

        // Insert attendance record
        const { data: attendance, error: attError } = await supabase
            .from('attendance')
            .insert([
                {
                    employee_id: employee.id,
                    latitude: finalLat || null,
                    longitude: finalLon || null,
                    distance_meters: distance,
                    alert_type: alertType,
                    status: status,
                    remarks: remarks || null,
                    scan_source: 'kiosk_monitoring'
                }
            ])
            .select()
            .single();

        if (attError) throw attError;

        // Log audit with details if alert
        await supabase.from('audit_logs').insert([
            {
                user_id: req.user.id,
                action: alertType ? 'SCAN_ALERT' : 'SCAN',
                table_name: 'attendance',
                record_id: attendance.id,
                changes: {
                    employee_id: employee.id,
                    name: employee.full_name,
                    distance: distance,
                    alert: alertType,
                    remarks: remarks || null,
                    area: employee.area || null
                }
            }
        ]);

        res.status(201).json({
            message: alertType ? `Scan recorded with alert: ${alertType}` : 'Scan recorded successfully',
            employee: {
                id: employee.id,
                employeeId: employee.employee_id,
                fullName: employee.full_name,
                role: employee.role,
                franchise: employee.franchise,
                area: employee.area,
                spvr: employee.spvr
            },
            attendance: attendance,
            alert: alertType,
            distance: distance
        });
    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to record scan' });
    }
});

// Get currently on-duty employees
router.get('/on-duty', async (req, res) => {
    try {
        // We consider an employee on-duty if they have a scan in the last 12 hours
        // This is a simplified logic. A real app might have clock-out or sessions.
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                employees!attendance_employee_id_fkey (
                    id,
                    employee_id,
                    full_name,
                    role,
                    franchise,
                    spvr,
                    photo_url,
                    latitude,
                    longitude
                )
            `)
            .eq('scan_source', 'kiosk_monitoring')
            .gt('scan_time', twelveHoursAgo)
            .order('scan_time', { ascending: false });

        if (error) {
            console.error('DATABASE ERROR in on-duty:', error);
            throw error;
        }

        // Group by Employee (Latest scan only)
        const uniqueOnDuty = [];
        const seenIds = new Set();

        for (const record of data) {
            if (!seenIds.has(record.employee_id)) {
                seenIds.add(record.employee_id);
                uniqueOnDuty.push(record);
            }
        }

        res.json({ onDuty: uniqueOnDuty });
    } catch (error) {
        console.error('Get on-duty error:', error);
        res.status(500).json({ error: 'Failed to fetch on-duty status' });
    }
});

// Get scan history
router.get('/history', async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                employees!attendance_employee_id_fkey (
                    employee_id,
                    full_name,
                    role,
                    franchise,
                    area,
                    spvr,
                    photo_url
                )
            `)
            .order('scan_time', { ascending: false })
            .limit(parseInt(limit));

        if (error) {
            console.error('DATABASE ERROR in history:', error);
            throw error;
        }

        res.json({ history: data });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get all locations for today's map
router.get('/daily-map', async (req, res) => {
    try {
        // Start of today (00:00:00)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('attendance')
            .select(`
                *,
                employees!attendance_employee_id_fkey (
                    id,
                    employee_id,
                    full_name,
                    role,
                    franchise,
                    spvr,
                    photo_url,
                    latitude,
                    longitude
                )
            `)
            .gt('scan_time', todayStart.toISOString())
            .order('scan_time', { ascending: false });

        if (error) throw error;

        // Group by Employee (Latest scan only)
        const uniqueScans = [];
        const seenIds = new Set();
        const activeThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago

        for (const record of data) {
            if (!seenIds.has(record.employee_id)) {
                seenIds.add(record.employee_id);

                const scanTime = new Date(record.scan_time);
                const isRecent = scanTime > activeThreshold;

                let status = 'today';
                if (record.status === 'Inactive') {
                    status = 'inactive';
                } else if (isRecent) {
                    status = 'active';
                }

                uniqueScans.push({
                    ...record,
                    map_status: status
                });
            }
        }

        res.json({ locations: uniqueScans });
    } catch (error) {
        console.error('Map data error:', error);
        res.status(500).json({ error: 'Failed to fetch map data' });
    }
});

module.exports = router;

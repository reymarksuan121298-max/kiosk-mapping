const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

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

// Public endpoint - Time In / Time Out (no authentication required)
router.post('/clock-in', async (req, res) => {
    try {
        const { employeeId, latitude, longitude, type = 'Time In' } = req.body;

        console.log(`--- ${type.toUpperCase()} REQUEST ---`);
        console.log('Employee ID:', employeeId);
        console.log('Location:', latitude, longitude);

        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }

        // Time Window Validation
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTimeInMinutes = hour * 60 + minute;

        if (type === 'Time In') {
            const startLimit = 6 * 60; // 06:00
            const endLimit = 8 * 60 + 30; // 08:30
            if (currentTimeInMinutes < startLimit || currentTimeInMinutes > endLimit) {
                return res.status(403).json({
                    error: "Time In is only allowed between 6:00 AM and 8:30 AM"
                });
            }
        } else if (type === 'Time Out') {
            const startLimit = 20 * 60 + 30; // 20:30 (8:30 PM)
            const endLimit = 21 * 60; // 21:00 (9:00 PM)
            if (currentTimeInMinutes < startLimit || currentTimeInMinutes > endLimit) {
                return res.status(403).json({
                    error: "Time Out is only allowed between 8:30 PM and 9:00 PM"
                });
            }
        }

        // Clean the ID
        const cleanId = employeeId.trim();

        // Find the employee
        const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('id, full_name, employee_id, latitude, longitude, radius_meters, role, franchise, area, spvr, photo_url')
            .eq('employee_id', cleanId);

        if (empError) {
            console.error('Database Error:', empError);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!employees || employees.length === 0) {
            console.log('❌ Employee NOT found');
            return res.status(404).json({ error: `Employee not found: ${cleanId}` });
        }

        const employee = employees[0];
        console.log('✅ Employee FOUND:', employee.full_name);

        // Calculate distance
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
            return res.status(400).json({ error: 'GPS coordinates are required for attendance' });
        } else if (!employee.latitude || !employee.longitude) {
            return res.status(400).json({ error: 'No registered coordinates found for this employee. Please contact admin.' });
        }

        // Set status based on type
        // If type is 'Time In', status is 'Active'
        // If type is 'Time Out', status is 'Inactive'
        const status = type === 'Time Out' ? 'Inactive' : 'Active';

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
                    remarks: type, // Store 'Time In' or 'Time Out' in remarks
                    scan_source: 'employee_attendance'
                }
            ])
            .select()
            .single();

        if (attError) {
            console.error('Attendance insert error:', attError);
            throw attError;
        }

        // Log audit trail
        const actionPrefix = type === 'Time Out' ? 'PUBLIC_TIMEOUT' : 'PUBLIC_TIMEIN';
        await supabase.from('audit_logs').insert([
            {
                user_id: null, // System/Automated
                action: alertType ? `${actionPrefix}_ALERT` : actionPrefix,
                table_name: 'attendance',
                record_id: attendance.id,
                changes: {
                    employee_id: employee.id,
                    name: employee.full_name,
                    type: type,
                    distance: distance,
                    alert: alertType,
                    source: 'employee-attendance-app'
                }
            }
        ]);

        console.log(`✅ ${type} recorded:`, attendance.id);

        res.status(201).json({
            message: `${type} successful`,
            employee: {
                id: employee.id,
                employeeId: employee.employee_id,
                fullName: employee.full_name,
                role: employee.role,
                franchise: employee.franchise,
                area: employee.area,
                spvr: employee.spvr,
                photoUrl: employee.photo_url
            },
            attendance: attendance,
            alert: alertType,
            distance: distance,
            type: type
        });
    } catch (error) {
        console.error('Clock-in error:', error);
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});

module.exports = router;

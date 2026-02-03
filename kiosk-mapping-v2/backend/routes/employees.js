const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
    }
});

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Helper function to map database employee to frontend format
function mapEmployee(emp) {
    if (!emp) return null;
    return {
        id: emp.id,
        employeeId: emp.employee_id,
        fullName: emp.full_name,
        spvr: emp.spvr,
        role: emp.role,
        address: emp.address,
        latitude: emp.latitude ? parseFloat(emp.latitude) : null,
        longitude: emp.longitude ? parseFloat(emp.longitude) : null,
        franchise: emp.franchise,
        area: emp.area,
        status: emp.status,
        radiusMeters: emp.radius_meters ? parseInt(emp.radius_meters) : 200,
        photoUrl: emp.photo_url,
        qrCode: emp.qr_code,
        createdBy: emp.created_by,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at
    };
}

// Helper function to log audit
async function logAudit(userId, action, recordId, changes = null) {
    try {
        await supabase.from('audit_logs').insert([
            {
                user_id: userId,
                action,
                table_name: 'employees',
                record_id: recordId,
                changes
            }
        ]);
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

// Get all employees
router.get('/', async (req, res) => {
    try {
        const { status, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

        let query = supabase
            .from('employees')
            .select('*');

        // Filter by status
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Search by name or employee_id
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,employee_id.ilike.%${search}%`);
        }

        // Sort
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        const { data, error } = await query;

        if (error) throw error;

        res.json({ employees: (data || []).map(mapEmployee) });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get single employee
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ employee: mapEmployee(data) });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// Create employee - Admin only
router.post('/', authorize(['admin']), async (req, res) => {
    try {
        const {
            employeeId,
            fullName,
            spvr,
            role,
            address,
            latitude,
            longitude,
            franchise,
            area,
            status,
            radiusMeters,
            photoUrl,
            qrCode
        } = req.body;

        // Validate required fields
        if (!employeeId || !fullName || !role) {
            return res.status(400).json({ error: 'Employee ID, name, and role are required' });
        }

        // Check if employee ID already exists
        const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('employee_id', employeeId)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'Employee ID already exists' });
        }

        // Create employee
        const { data: newEmployee, error } = await supabase
            .from('employees')
            .insert([
                {
                    employee_id: employeeId,
                    full_name: fullName,
                    spvr,
                    role,
                    address,
                    latitude,
                    longitude,
                    franchise,
                    area: area || 'LDN',
                    status: status || 'Active',
                    radius_meters: radiusMeters || 200,
                    photo_url: photoUrl,
                    qr_code: qrCode,
                    created_by: req.user.id
                }
            ])
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await logAudit(req.user.id, 'CREATE', newEmployee.id, newEmployee);

        res.status(201).json({
            message: 'Employee created successfully',
            employee: mapEmployee(newEmployee)
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// Update employee - Admin only
router.put('/:id', authorize(['admin']), async (req, res) => {
    try {
        const {
            employeeId,
            fullName,
            spvr,
            role,
            address,
            latitude,
            longitude,
            franchise,
            area,
            status,
            radiusMeters,
            photoUrl,
            qrCode
        } = req.body;

        // Get existing employee for audit
        const { data: oldEmployee } = await supabase
            .from('employees')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (!oldEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Update employee
        const { data: updatedEmployee, error } = await supabase
            .from('employees')
            .update({
                employee_id: employeeId,
                full_name: fullName,
                spvr,
                role,
                address,
                latitude,
                longitude,
                franchise,
                area,
                status,
                radius_meters: radiusMeters || 200,
                photo_url: photoUrl,
                qr_code: qrCode
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Log audit with changes
        await logAudit(req.user.id, 'UPDATE', req.params.id, {
            before: oldEmployee,
            after: updatedEmployee
        });

        res.json({
            message: 'Employee updated successfully',
            employee: mapEmployee(updatedEmployee)
        });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// Delete employee - Admin only
router.delete('/:id', authorize(['admin']), async (req, res) => {
    try {
        // Get employee for audit
        const { data: employee } = await supabase
            .from('employees')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Delete employee
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

        // Log audit
        await logAudit(req.user.id, 'DELETE', req.params.id, employee);

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// Get employee statistics
router.get('/stats/summary', async (req, res) => {
    try {
        // Get total count
        const { count: totalCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true });

        // Get active count
        const { count: activeCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Active');

        // Get inactive count
        const { count: inactiveCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Deactive');

        // Get employees with GPS
        const { count: gpsCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

        res.json({
            total: totalCount || 0,
            active: activeCount || 0,
            inactive: inactiveCount || 0,
            withGPS: gpsCount || 0
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Upload employee photo - Admin only
router.post('/upload', authorize(['admin']), upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const photoUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        res.json({
            message: 'Photo uploaded successfully',
            photoUrl
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

module.exports = router;

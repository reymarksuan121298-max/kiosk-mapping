const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get audit logs
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, action, userId } = req.query;

        let query = supabase
            .from('audit_logs')
            .select(`
        *,
        users (
          id,
          email,
          full_name
        )
      `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by action
        if (action) {
            query = query.eq('action', action);
        }

        // Filter by user
        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            logs: data || [],
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// Get audit log by ID
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select(`
        *,
        users (
          id,
          email,
          full_name
        )
      `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Audit log not found' });
        }

        res.json({ log: data });
    } catch (error) {
        console.error('Get audit log error:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

// Clear all audit logs - Admin only
router.delete('/', authorize(['admin']), async (req, res) => {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

        if (error) throw error;

        res.json({ message: 'Audit logs cleared successfully' });
    } catch (error) {
        console.error('Clear audit logs error:', error);
        res.status(500).json({ error: 'Failed to clear audit logs' });
    }
});

module.exports = router;

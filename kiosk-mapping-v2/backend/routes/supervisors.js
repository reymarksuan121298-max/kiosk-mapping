const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all supervisors
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('supervisors')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({ supervisors: data || [] });
    } catch (error) {
        console.error('Get supervisors error:', error);
        res.status(500).json({ error: 'Failed to fetch supervisors' });
    }
});

module.exports = router;

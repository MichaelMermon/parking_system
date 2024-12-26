const express = require('express');
const router = express.Router();
const db = require('../db/connection'); // Adjust based on actual path

router.get('/slots', (req, res) => {
    const query = 'SELECT * FROM slots';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch slot data' });
        }
        res.json(results);
    });
});

module.exports = router;

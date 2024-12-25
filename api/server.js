const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

// MySQL database connection setup
const db = mysql.createConnection({
  host: 'sql12.freesqldatabase.com',
  user: 'sql12754090',
  password: 'lSyCf4zATI',
  database: 'sql12754090',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// API handler for reservations
module.exports = (req, res) => {
  if (req.method === 'GET' && req.url === '/api/slots') {
    // Fetch slots from MySQL database
    const query = 'SELECT * FROM slots';
    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch slot data' });
      }
      res.json(results);  // Send slot data as response
    });
  }

  if (req.method === 'POST' && req.url === '/api/reserve') {
    const { slot_number, start, end, name, contact } = req.body;

    // Check if all required fields are provided
    if (!slot_number || !start || !end || !name || !contact) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert the reservation details into the reservations table
    const reserveQuery = 'INSERT INTO reservations (slot_number, start, end, name, contact) VALUES (?, ?, ?, ?, ?)';
    db.query(reserveQuery, [slot_number, start, end, name, contact], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to reserve slot' });
      }

      // Update the slot status to "occupied"
      const updateSlotQuery = 'UPDATE slots SET status = FALSE WHERE slot_number = ?';
      db.query(updateSlotQuery, [slot_number], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update slot status' });
        }
        res.status(201).json({ message: 'Reservation successful' });
      });
    });
  } else {
    res.status(404).json({ message: 'API endpoint not found' });
  }
};

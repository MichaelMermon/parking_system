const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Use CORS middleware to allow requests from specific origins
app.use(cors({
  origin: 'https://parking-system-nine.vercel.app/', // Adjust to your frontend URL for production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Middleware to parse incoming request bodies in JSON format
app.use(bodyParser.json());

// MySQL database connection setup using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'parking',
});

// Connect to the MySQL database
db.connect((err) => {
  if (err) {
    console.error('Failed to connect to the database:', err);
    process.exit(1); // Terminate the process on critical error
  }
  console.log('Connected to MySQL database');
});

// Function to check and clean up expired reservations
function checkExpiredReservations() {
  const currentTime = new Date();

  const query = 'SELECT * FROM reservations WHERE end <= ?';
  db.query(query, [currentTime], (err, results) => {
    if (err) {
      console.error('Failed to fetch expired reservations:', err);
      return;
    }

    results.forEach((reservation) => {
      const { slot_number, id } = reservation;

      const updateSlotQuery = 'UPDATE slots SET status = TRUE WHERE slot_number = ?';
      db.query(updateSlotQuery, [slot_number], (err) => {
        if (err) {
          console.error(`Failed to update slot ${slot_number}:`, err);
        } else {
          console.log(`Slot ${slot_number} marked as available`);
        }
      });

      const deleteReservationQuery = 'DELETE FROM reservations WHERE id = ?';
      db.query(deleteReservationQuery, [id], (err) => {
        if (err) {
          console.error(`Failed to delete reservation ID ${id}:`, err);
        } else {
          console.log(`Reservation ID ${id} removed`);
        }
      });
    });
  });
}

// Schedule the expiration check every minute
setInterval(checkExpiredReservations, 60 * 1000);

// API to fetch the parking slot status
app.get('/api/slots', (req, res) => {
  const query = 'SELECT * FROM slots';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch slot data' });
    }
    res.json(results);
  });
});

// API to reserve a parking slot
app.post('/api/reserve', (req, res) => {
  const { slot_number, start, end, name, contact } = req.body;

  if (!slot_number || !start || !end || !name || !contact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const checkSlotQuery = 'SELECT * FROM slots WHERE slot_number = ? AND status = TRUE';
  db.query(checkSlotQuery, [slot_number], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to check slot availability' });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'Slot is not available' });
    }

    const reserveQuery = 'INSERT INTO reservations (slot_number, start, end, name, contact) VALUES (?, ?, ?, ?, ?)';
    db.query(reserveQuery, [slot_number, start, end, name, contact], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to reserve slot' });
      }

      const updateSlotQuery = 'UPDATE slots SET status = FALSE WHERE slot_number = ?';
      db.query(updateSlotQuery, [slot_number], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update slot status' });
        }
        res.status(201).json({ message: 'Reservation successful' });
      });
    });
  });
});

// API to fetch a reservation by contact number
app.get('/api/reservations', (req, res) => {
  const { contact } = req.query;

  if (!contact) {
    return res.status(400).json({ error: 'Contact is required' });
  }

  const query = 'SELECT * FROM reservations WHERE contact = ? ORDER BY created_at DESC';
  db.query(query, [contact], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch reservation history' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No reservations found' });
    }

    res.json(results[0]);
  });
});

// API to cancel a reservation
app.post('/api/cancel-reservation', (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Reservation ID is required' });
  }

  const checkReservationQuery = 'SELECT * FROM reservations WHERE id = ?';
  db.query(checkReservationQuery, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch reservation' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const { slot_number } = results[0];

    const deleteReservationQuery = 'DELETE FROM reservations WHERE id = ?';
    db.query(deleteReservationQuery, [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to cancel reservation' });
      }

      const updateSlotQuery = 'UPDATE slots SET status = TRUE WHERE slot_number = ?';
      db.query(updateSlotQuery, [slot_number], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update slot status' });
        }

        res.status(200).json({ success: true, message: 'Reservation cancelled successfully' });
      });
    });
  });
});

// Export the app for Vercel
module.exports = app;

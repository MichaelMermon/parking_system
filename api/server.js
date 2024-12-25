const mysql = require('mysql2');
const cors = require('cors');
const express = require('express');

// Initialize Express app
const app = express();

// CORS middleware to allow requests from different origins
app.use(cors());
app.use(express.json());

// MySQL database connection setup (use environment variables for security)
const db = mysql.createConnection({
  host: 'sql12.freesqldatabase.com' || 'localhost',  // Use environment variables in Vercel
  user: 'sql12754090' || 'root',
  password: 'lSyCf4zATI' || 'Aynmondealize0369@',
  database: 'sql12754090' || 'parking_system',
});

// Connect to MySQL database
db.connect((err) => {
  if (err) {
    console.error('Failed to connect to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Function to check and clean up expired reservations
function checkExpiredReservations() {
  const currentTime = new Date();

  // Query to find expired reservations
  const query = 'SELECT * FROM reservations WHERE end <= ?';
  db.query(query, [currentTime], (err, results) => {
    if (err) {
      console.error('Failed to fetch expired reservations:', err);
      return;
    }

    // For each expired reservation, update the slot status and delete the reservation
    results.forEach((reservation) => {
      const { slot_number, id } = reservation;

      // Update the slot status to available
      const updateSlotQuery = 'UPDATE slots SET status = TRUE WHERE slot_number = ?';
      db.query(updateSlotQuery, [slot_number], (err) => {
        if (err) {
          console.error(`Failed to update slot ${slot_number}:`, err);
        } else {
          console.log(`Slot ${slot_number} marked as available`);
        }
      });

      // Delete the expired reservation
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
setInterval(checkExpiredReservations, 60 * 1000); // Runs every 60 seconds

// API to fetch the parking slot status (available or occupied)
app.get('/api/slots', (req, res) => {
  const query = 'SELECT * FROM slots';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch slot data' });
    }
    res.json(results); // Send slot data as response
  });
});

// API to reserve a parking slot
app.post('/api/reserve', (req, res) => {
  const { slot_number, start, end, name, contact } = req.body;

  if (!slot_number || !start || !end || !name || !contact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if the selected slot is available
  const checkSlotQuery = 'SELECT * FROM slots WHERE slot_number = ? AND status = TRUE';
  db.query(checkSlotQuery, [slot_number], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to check slot availability' });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'Slot is not available' });
    }

    // Insert reservation into the reservations table
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

    res.json(results[0]); // Return the most recent reservation
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

// Export the Express app as a serverless function (required by Vercel)
module.exports = app;

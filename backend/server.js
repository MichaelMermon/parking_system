const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;

// Use CORS middleware to allow requests from different origins
app.use(cors());

// Serve static files from 'public' folder for the frontend
app.use(express.static(path.join(__dirname, 'public')));

// MySQL database connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Aynmondealize0369@',
  database: 'parking_system',
});

// Connect to the MySQL database
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Middleware to parse incoming request bodies in JSON format
app.use(bodyParser.json());

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

  // Check if all required fields are provided
  if (!slot_number || !start || !end || !name || !contact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Query to check if the selected slot is available
  const checkSlotQuery = 'SELECT * FROM slots WHERE slot_number = ? AND status = TRUE';
  db.query(checkSlotQuery, [slot_number], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to check slot availability' });
    }

    // If slot is unavailable, return an error
    if (results.length === 0) {
      return res.status(400).json({ error: 'Slot is not available' });
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

    // If no reservations found, return a message
    if (results.length === 0) {
      return res.status(404).json({ message: 'No reservations found' });
    }

    // Return the most recent reservation
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

    // If reservation is not found, return an error
    if (results.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const { slot_number } = results[0];

    // Delete the reservation from the database
    const deleteReservationQuery = 'DELETE FROM reservations WHERE id = ?';
    db.query(deleteReservationQuery, [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to cancel reservation' });
      }

      // Update the slot status to available
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

// Start the Express server on port 3000
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

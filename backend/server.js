const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;

// Use CORS middleware to allow requests from different origins
app.use(cors());

// Serve static files from 'public' folder for the frontend
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL database connection setup
const pool = new Pool({
  user: 'your-username',       // Your Supabase username
  host: 'db.supabase.co',      // Replace with your Supabase database host
  database: 'your-database',   // Your Supabase database name
  password: 'your-password',   // Your Supabase password
  port: 5432,                  // Default PostgreSQL port
});

// Middleware to parse incoming request bodies in JSON format
app.use(bodyParser.json());

// Function to check and clean up expired reservations
async function checkExpiredReservations() {
  const currentTime = new Date();

  try {
    const result = await pool.query('SELECT * FROM reservations WHERE "end" <= $1', [currentTime]);

    // For each expired reservation, update the slot status and delete the reservation
    result.rows.forEach(async (reservation) => {
      const { slot_id, id } = reservation;

      // Update the slot status to available
      await pool.query('UPDATE slots SET status = TRUE WHERE id = $1', [slot_id]);

      // Delete the expired reservation
      await pool.query('DELETE FROM reservations WHERE id = $1', [id]);
    });
  } catch (err) {
    console.error('Error checking expired reservations:', err);
  }
}

// Schedule the expiration check every minute
setInterval(checkExpiredReservations, 60 * 1000); // Runs every 60 seconds

// API to fetch the parking slot status (available or occupied)
app.get('/api/slots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM slots');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slot data' });
  }
});

// API to reserve a parking slot
app.post('/api/reserve', async (req, res) => {
  const { slot_number, start, end, name, contact } = req.body;

  // Check if all required fields are provided
  if (!slot_number || !start || !end || !name || !contact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if the selected slot is available
    const slotResult = await pool.query('SELECT * FROM slots WHERE slot_number = $1 AND status = TRUE', [slot_number]);

    if (slotResult.rows.length === 0) {
      return res.status(400).json({ error: 'Slot is not available' });
    }

    // Insert the reservation details into the reservations table
    const reserveResult = await pool.query(
      'INSERT INTO reservations (slot_id, start, "end", name, contact) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [slotResult.rows[0].id, start, end, name, contact]
    );

    // Update the slot status to "occupied"
    await pool.query('UPDATE slots SET status = FALSE WHERE id = $1', [slotResult.rows[0].id]);

    res.status(201).json({ message: 'Reservation successful', reservationId: reserveResult.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reserve slot' });
  }
});

// API to fetch a reservation by contact number
app.get('/api/reservations', async (req, res) => {
  const { contact } = req.query;

  if (!contact) {
    return res.status(400).json({ error: 'Contact is required' });
  }

  try {
    const result = await pool.query('SELECT * FROM reservations WHERE contact = $1 ORDER BY created_at DESC', [contact]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No reservations found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reservation history' });
  }
});

// API to cancel a reservation
app.post('/api/cancel-reservation', async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Reservation ID is required' });
  }

  try {
    const result = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const { slot_id } = result.rows[0];

    // Delete the reservation
    await pool.query('DELETE FROM reservations WHERE id = $1', [id]);

    // Update the slot status to available
    await pool.query('UPDATE slots SET status = TRUE WHERE id = $1', [slot_id]);

    res.status(200).json({ success: true, message: 'Reservation cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

// Start the Express server on port 3000
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

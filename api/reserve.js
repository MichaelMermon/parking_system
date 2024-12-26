const db = require('../db/connection');

export default (req, res) => {
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
};

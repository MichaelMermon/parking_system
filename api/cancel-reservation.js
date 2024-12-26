const db = require('../db/connection');

export default (req, res) => {
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
        res.status(200).json({ message: 'Reservation cancelled successfully' });
      });
    });
  });
};

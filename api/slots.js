const db = require('../db/connection');

export default (req, res) => {
  const query = 'SELECT * FROM slots';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch slot data' });
    }
    res.status(200).json(results);
  });
};

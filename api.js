const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS untuk semua origin
app.use(cors());

// Jika ingin membatasi origin tertentu, bisa ditulis seperti ini
// app.use(cors({
//   origin: 'https://your-frontend-domain.com'
// }));

app.get('/api', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// backend/src/index.ts
import express from 'express';
import path from 'path';

const app = express();
const port = 3000;

// Serve static files from the frontend/public directory
app.use(express.static(path.join(__dirname, '../../frontend/public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

app.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}/`);
});

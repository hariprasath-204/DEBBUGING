import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/compile', async (req, res) => {
  try {
    const { code, compiler } = req.body;

    if (!code || !compiler) {
      return res.status(400).json({ error: 'Code and compiler parameters are required' });
    }

    const response = await axios.post('https://wandbox.org/api/compile.json', {
      code,
      compiler,
      save: false
    });

    res.json(response.data);
  } catch (error) {
    console.error("Compilation error:", error?.message);
    res.status(500).json({ error: 'Failed to compile code via Wandbox API' });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;

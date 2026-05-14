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

    const isJava = compiler.includes('openjdk');

    const payload = {
      code,
      compiler,
      save: false,
      // Java on Wandbox requires filename to match the class name
      ...(isJava && { filename: 'Main.java' })
    };

    const response = await axios.post('https://wandbox.org/api/compile.json', payload, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    res.json(response.data);
  } catch (error) {
    const detail = error?.response?.data || error?.message || 'Unknown error';
    console.error("Compilation error:", JSON.stringify(detail));
    res.status(500).json({ error: 'Failed to compile', detail });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback for SPA routing
app.get(/^(.*)$/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;

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

const DEFAULT_API_KEY = process.env.ONLINE_COMPILER_API_KEY || '28152502bdcf827c763a92f0bf7ed806';

app.post('/api/compile', async (req, res) => {
  const { code, compiler, apiKey } = req.body;

  if (!code || !compiler) {
    return res.status(400).json({ error: 'Code and compiler parameters are required' });
  }

  const activeApiKey = apiKey || DEFAULT_API_KEY;

  const ONLINE_COMPILER_LANG = {
    "c": "gcc-15",
    "gcc-head-c": "gcc-15",
    "c++": "g++-15",
    "cpp": "g++-15",
    "gcc-head": "g++-15",
    "java": "openjdk-25",
    "openjdk-head": "openjdk-25",
    "python": "python-3.14"
  };

  const ocCompiler = ONLINE_COMPILER_LANG[compiler.toLowerCase()] || compiler;
  const keys = [
    activeApiKey,
    "28152502bdcf827c763a92f0bf7ed806",
    "42084204b0195f78ed851ac35c43a059",
    "ccb79ad09699924cb025d0ba0b6690ed"
  ].filter(Boolean);

  const uniqueKeys = [...new Set(keys)];

  for (const key of uniqueKeys) {
    try {
      const ocPayload = {
        compiler: ocCompiler,
        code: code,
        input: ""
      };

      const ocResp = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', ocPayload, {
        timeout: 20000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': key,
          'ApiKey': key
        }
      });

      return res.json({
        program_message: ocResp.data.output || ocResp.data.result || ocResp.data.stdout || '',
        compiler_error: ocResp.data.error || ocResp.data.stderr || ''
      });
    } catch (err) {
      console.warn(`OnlineCompiler attempt failed with key (${key.slice(0, 6)}...):`, err?.message);
    }
  }

  return res.status(500).json({
    error: 'Compilation failed on OnlineCompiler engine.',
    detail: 'All OnlineCompiler endpoints or keys failed to execute.'
  });
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

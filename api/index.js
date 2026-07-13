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
  try {
    const { code, compiler, apiKey } = req.body;

    if (!code || !compiler) {
      return res.status(400).json({ error: 'Code and compiler parameters are required' });
    }

    const activeApiKey = apiKey || DEFAULT_API_KEY;

    // Map compiler identifier for OnlineCompiler API
    let ocCompiler = compiler;
    if (compiler.includes('gcc-head-c') || compiler === 'c') ocCompiler = 'c';
    else if (compiler.includes('gcc-head') || compiler === 'cpp') ocCompiler = 'cpp';
    else if (compiler.includes('openjdk') || compiler === 'java') ocCompiler = 'java';

    const ocPayload = {
      compiler: ocCompiler,
      code: code,
      input: ""
    };

    const ocResp = await axios.post('https://api.onlinecompiler.io/api/run-code-sync/', ocPayload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeApiKey}`,
        'ApiKey': activeApiKey
      }
    });

    return res.json({
      program_message: ocResp.data.output || ocResp.data.result || ocResp.data.stdout || '',
      compiler_error: ocResp.data.error || ocResp.data.stderr || ''
    });
  } catch (error) {
    const detail = error?.response?.data || error?.message || 'Unknown error';
    console.error("OnlineCompiler Compilation error:", JSON.stringify(detail));
    res.status(500).json({ error: 'Failed to compile using OnlineCompiler API', detail });
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

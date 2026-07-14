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

  // 1. Try OnlineCompiler API first
  try {
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
      timeout: 15000,
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
  } catch (ocError) {
    console.warn("OnlineCompiler API failed, falling back to Wandbox API...", ocError?.message);

    // 2. Seamless Fallback to Wandbox API
    try {
      let wandboxCompiler = compiler;
      if (compiler === 'c') wandboxCompiler = 'gcc-head-c';
      else if (compiler === 'cpp') wandboxCompiler = 'gcc-head';
      else if (compiler === 'java') wandboxCompiler = 'openjdk-head';

      const wandboxPayload = {
        compiler: wandboxCompiler,
        code: code,
        save: false
      };

      const wandboxResp = await axios.post('https://wandbox.org/api/compile.json', wandboxPayload, {
        timeout: 25000,
        headers: { 'Content-Type': 'application/json' }
      });

      return res.json({
        program_message: wandboxResp.data.program_message || wandboxResp.data.program_output || '',
        compiler_error: wandboxResp.data.compiler_error || wandboxResp.data.compiler_message || ''
      });
    } catch (wandboxError) {
      console.error("Compilation failed on both engines:", wandboxError?.message);
      return res.status(500).json({
        error: 'Compilation failed on all compiler engines.',
        detail: wandboxError?.message || 'Unknown compiler error'
      });
    }
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

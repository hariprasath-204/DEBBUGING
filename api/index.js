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

// ── Array of JDoodle API Credentials (Supports 20+ keys for automatic failover) ──
// If a key exhausts its daily credit limit (statusCode 429 / Daily limit exceeded / Unauthorized),
// the compiler loop automatically retries the Java program using the next key in this array.
const JDOODLE_KEYS = [
  {
    clientId: "4a9a6038b2a7e33b9a6b3739d857f178",
    clientSecret: "af69762f1a3185158b2feb6d50efc3255662084d3d3767c9614bc877bc4e9be"
  },
  {
    clientId: "3e8706c0cafdf8ff216561a0d3304d59",
    clientSecret: "7b15e29aefe3c416a105d85f544fab38d7707e5f479d586189cedfecd5dddbc1"
  }
  // Add additional 20+ JDoodle { clientId, clientSecret } objects right below:
];

app.get('/api/time', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.json({ now: Date.now() });
});

app.post('/api/compile', async (req, res) => {
  const { code, compiler, apiKey } = req.body;

  if (!code || !compiler) {
    return res.status(400).json({ error: 'Code and compiler parameters are required' });
  }

  const compLower = compiler.toLowerCase();

  // Use JDoodle specifically for Java/Javac to get full detailed compiler errors.
  // Loops through JDOODLE_KEYS array; automatically falls back to next key if current key fails.
  if (compLower === 'java' || compLower === 'javac' || compLower.includes('openjdk')) {
    let lastErrorDetail = "Failed to execute Java program on JDoodle.";

    for (let i = 0; i < JDOODLE_KEYS.length; i++) {
      const { clientId, clientSecret } = JDOODLE_KEYS[i];
      try {
        const jdoodlePayload = {
          clientId,
          clientSecret,
          script: code,
          language: "java",
          versionIndex: "4"
        };

        const jdResp = await axios.post('https://api.jdoodle.com/v1/execute', jdoodlePayload, {
          timeout: 20000,
          headers: { 'Content-Type': 'application/json' }
        });

        // Check if JDoodle returned an error indicating quota limit exceeded (e.g. 429 / Daily limit / Credit exhausted)
        const errorMsg = jdResp.data?.error || "";
        if (
          jdResp.data?.statusCode === 429 ||
          jdResp.data?.statusCode === 401 ||
          errorMsg.toLowerCase().includes('daily limit') ||
          errorMsg.toLowerCase().includes('limit exceeded') ||
          errorMsg.toLowerCase().includes('credit')
        ) {
          console.warn(`JDoodle key index [${i}] limit/error exceeded (${errorMsg || jdResp.data?.statusCode}), switching to next API key...`);
          lastErrorDetail = errorMsg || `JDoodle API Key #${i + 1} quota exceeded`;
          continue; // Try next API key in the array
        }

        const output = jdResp.data?.output || "No output returned.";
        const isError = jdResp.data?.statusCode !== 200 || output.includes('error:') || output.includes('Exception in thread');

        return res.json({
          program_message: output,
          compiler_error: isError ? output : ""
        });
      } catch (err) {
        const errDetail = err?.response?.data?.error || err?.response?.data?.output || err?.message;
        console.warn(`JDoodle key index [${i}] execution failed:`, errDetail);
        lastErrorDetail = errDetail;

        // If not the last key, loop to try next key
        if (i < JDOODLE_KEYS.length - 1) {
          continue;
        }
      }
    }

    // If all keys in JDOODLE_KEYS have been tried and failed
    console.error("All JDoodle API keys exhausted or failed.");
    return res.status(500).json({
      error: "Java compilation failed. All JDoodle API keys exhausted or unavailable.",
      detail: lastErrorDetail
    });
  }

  const activeApiKey = apiKey || DEFAULT_API_KEY;

  const ONLINE_COMPILER_LANG = {
    "c": "gcc-15",
    "gcc-head-c": "gcc-15",
    "c++": "g++-15",
    "cpp": "g++-15",
    "gcc-head": "g++-15",
    "python": "python-3.14"
  };

  const ocCompiler = ONLINE_COMPILER_LANG[compLower] || compiler;
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

      let outputText = [
        ocResp.data.output,
        ocResp.data.result,
        ocResp.data.stdout
      ].filter(s => typeof s === 'string' && s.trim().length > 0).join('\n');

      let errorText = [
        ocResp.data.error,
        ocResp.data.stderr,
        ocResp.data.compile_error,
        ocResp.data.compiler_error,
        ocResp.data.exception,
        ocResp.data.message
      ].filter(s => typeof s === 'string' && s.trim().length > 0 && s !== outputText).join('\n');

      let combinedMessage = [outputText, errorText].filter(Boolean).join('\n\n');
      if (!combinedMessage.trim()) {
        combinedMessage = "No output returned.";
      }

      return res.json({
        program_message: combinedMessage,
        compiler_error: errorText
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

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import fs from 'fs/promises';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

const DEFAULT_API_KEY = process.env.ONLINE_COMPILER_API_KEY || '28152502bdcf827c763a92f0bf7ed806';

async function getJavaSyntaxError(code) {
  try {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'java-check-'));
    const normalizedCode = code.replace(/public\s+class\s+[a-zA-Z0-9_]+/g, 'public class Main');
    const filePath = path.join(tmpDir, 'Main.java');
    await fs.writeFile(filePath, normalizedCode, 'utf8');

    return await new Promise((resolve) => {
      exec(`javac "${filePath}"`, async (error, stdout, stderr) => {
        const errorOutput = (stderr || stdout || '').toString();
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        if (errorOutput && errorOutput.trim()) {
          const cleanedError = errorOutput.replaceAll(filePath, 'Main.java');
          resolve(cleanedError.trim());
        } else {
          resolve("Compilation Error: Please verify Java class name and syntax.");
        }
      });
    });
  } catch (err) {
    return "Compilation Error: Code execution failed.";
  }
}

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
      // Normalize Java public class name to Main for OnlineCompiler environment
      const codeToSend = (ocCompiler === 'openjdk-25' || compiler.toLowerCase() === 'java')
        ? code.replace(/public\s+class\s+[a-zA-Z0-9_]+/g, 'public class Main')
        : code;

      const ocPayload = {
        compiler: ocCompiler,
        code: codeToSend,
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

      if ((ocCompiler === 'openjdk-25' || compiler.toLowerCase() === 'java') &&
          (errorText.includes('Internal error: code execution failed') || !outputText.trim())) {
        if (errorText.includes('Internal error: code execution failed') || errorText.trim() === '') {
          const detailedSyntaxError = await getJavaSyntaxError(code);
          errorText = detailedSyntaxError;
        }
      }

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

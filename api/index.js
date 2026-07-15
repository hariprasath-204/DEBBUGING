import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const DEFAULT_API_KEY = process.env.ONLINE_COMPILER_API_KEY || '28152502bdcf827c763a92f0bf7ed806';

// ── Array of JDoodle API Credentials (Supports 20+ keys for automatic failover) ──
// If a key exhausts its daily credit limit (statusCode 429 / Daily limit exceeded / Unauthorized),
// the compiler loop automatically retries the Java program using the next key in this array.
let JDOODLE_KEYS = [
  // Existing 7 Keys
  {
    clientId: "4a9a6038b2a7e33b9a6b3739d857f178",
    clientSecret: "af69762f1a3185158b2feb6d50efc3255662084d3d3767c9614bc877bc4e9be"
  },
  {
    clientId: "3e8706c0cafdf8ff216561a0d3304d59",
    clientSecret: "7b15e29aefe3c416a105d85f544fab38d7707e5f479d586189cedfecd5dddbc1"
  },
  {
    clientId: "18e0a38b4e6695a1bba4f3a3381e174f",
    clientSecret: "228d6d9f6a1ad274de5db67988ec6fdb4cd52db34b3d93184d8e53bdb594b7a9"
  },
  {
    clientId: "5f45c84173c7098c031404a9674d6c70",
    clientSecret: "a91dfa30ca471cff624337eb0dcf80cfa22300f80ac9a7483d9c08bb1bcd66fb"
  },
  {
    clientId: "982a4209bc5bff19d1477e5a828cfaa7",
    clientSecret: "233b90363b565cec8868e8175e713efdcae02ee361c28f1c01299609b71871c2"
  },
  {
    clientId: "4da2716404770c9e712cfea86cb360e",
    clientSecret: "a4bf05d8b551544e80746fc149301d0570ee586cedd67ac1fcca78db0ec66d21"
  },
  {
    clientId: "1a12909b9e823337a62eeb3ecd23ee7f",
    clientSecret: "d23dfc7e285be4244bcac4069507284b512ce530bce1a9913d662055ba52e52d"
  },
  // Added 22 Keys
  {
    clientId: "e9d4c44d39706bc115fd78d1fa94ae0b",
    clientSecret: "2301490931d4fb5120c3a90054f4fdaf62adbab50e1c5340fb66a95834784950"
  },
  {
    clientId: "b30629e21f310dbf19aba52408e2a2a8",
    clientSecret: "d6d0b3c5e9375561a3cb95bae07c99f682d80010bd2a8d11f431f49ff06c78e2"
  },
  {
    clientId: "fd83f9d57ac69f9adeff2a6fdc73ffdb",
    clientSecret: "6defdfd8ddeaae552104964104bf893d24f18eab5dd80d680cee93bf8cf519fa"
  },
  {
    clientId: "314ca30886bd9620faafe84a5a0c4ebb",
    clientSecret: "c5c89a82ce82dc00d0983371b8b6313d4435b8aaac6b20dc03892ef6e63c4487"
  },
  {
    clientId: "9b7149e8f712ebe613986a00957e3edb",
    clientSecret: "5ace899a89ab28e7060c5e7cac49205df46387367e9d58d96bc379e7ce08fdce"
  },
  {
    clientId: "4b8d713065b8a0e847e698912c745460",
    clientSecret: "5ffb6c31effdf8914baabda5ec20bb461e1b7b75ecbcf2e825a0b3f5c7ff26b9"
  },
  {
    clientId: "decd504ec47ed1355d951fe5779d0fe4",
    clientSecret: "db582301b8d5e24094bd8e2f51293ece3198a377d3b8cb933d799416acb2a401"
  },
  {
    clientId: "196cb515a1006555e7ace58f43fc4c17",
    clientSecret: "5befa1e4d25d261b6deff0b916fcc82d4a15fd3c7bd1fc0046e4990feb86b85b"
  },
  {
    clientId: "b5d77dc299692b52116de24ffbbf19ac",
    clientSecret: "3f1840cca41b59d9b0e694cd26c969f9c38b3de9d49e895299ce08af6234270d"
  },
  {
    clientId: "ef832f26f387fdabc20f1ab5600fd398",
    clientSecret: "6cd152d68ddd2d04c3ef229f60fb6afb6291ad137ea0246ee7734b7bbf948ab2"
  },
  {
    clientId: "f979e6144c4a43700876fcad294de5c0",
    clientSecret: "1e9a334be85af822673e25547a5b94e362b00fbccd355cb57a740517042e3138"
  },
  {
    clientId: "ac5e6f41a7cad46d5b37a318ebd0ed78",
    clientSecret: "2e2384b0c3237b2fe0f3c177bc0b9d17bfed2b3356e385851cf25cc4efec6e6e"
  },
  {
    clientId: "508f04c91c99911af75cdc21fb72c675",
    clientSecret: "7c090ad0c46b72b47138ecff18c9a3f168faa77e129f75aadc915d61d668ecb2"
  },
  {
    clientId: "fa0cf8185c0b2b43c26e87ab5649c691",
    clientSecret: "779e4df53c34ad549665ed6fc17a4509ac357377c9462ffd3d370bea94aed840"
  },
  {
    clientId: "3717e4a63f833cce76eb5a610b0a58ff",
    clientSecret: "532ff37974a65ad86e39bb42f71d2df4ef2ab68301f2f78e54c7a5217cb76f75"
  },
  {
    clientId: "dbf60ee909b6ef93e7f3845376c7a9ea",
    clientSecret: "49862081bbe1c2e1494173b5ee79a09def675f4e481fb0755541a623c798d3f5"
  },
  {
    clientId: "721971bed2443f06b09cf9d965e40e2c",
    clientSecret: "c15b9aec9b3540942a72f012d05160099348b8fecbfe987a59f1b22a9e3d2ad4"
  },
  {
    clientId: "cfbbe31583110e83c74f5ae7ea77b6bf",
    clientSecret: "5c0e0bbc30ac9e5ad8f675c9b6c31abe562f2c8e11bddce2fec8b512c59393c4"
  },
  {
    clientId: "9baba800dcad9f64d0ef7e180226bcd0",
    clientSecret: "e4916385a6e5c003d267d919fa41de009c579684f69bf141e742d15069d2a5bb"
  },
  {
    clientId: "a9b709e280afbc916252ce9a691641f9",
    clientSecret: "806d741cd61967262c1641da1d2fe7f8e77489f56dbcb6506a1d57b0561407d3"
  },
  {
    clientId: "3513793f9cb42dce8d7bc7b79ce9ac72",
    clientSecret: "2da50081c7ffbf9841b3547fa7dd2cf6ac3405d6b3474ec360938260a549f70c"
  },
  {
    clientId: "9f2dd28002c61669a6ad40bed46b19b3",
    clientSecret: "fd365b49e35fa273a1c678af84d58e19bd3f8aab98f700d2136d5c42005e4b9f"
  },
  {
    clientId: "9382bb4b33c6d7d54591ab1156a0416c",
    clientSecret: "3c5d039783e89e6942141b11fe921c09d217e3e89c0219bf0d7f5973d49f46e8"
  }, {
    clientId: "4683a8489fbd7ca86613c84f1206c8a0",
    clientSecret: "d35724cff65bc3b1b046045739cb065b2d2c330b7b76bfd47decf1a2e26c9f8"
  },
  {
    clientId: "bfed6776eb31dbda2bedd391e7d0f3f1",
    clientSecret: "28c18fe94d2f3e8ad7d8855a63cc590373e94217b78e15287d930fb53aac6d3c"
  }
];

let JDOODLE_KEY_STATUS = {};

app.all('/api/jdoodle/count', (req, res) => {
  const customKeys = Array.isArray(req.body?.keys) ? req.body.keys : [];
  const allUnique = [...JDOODLE_KEYS];
  for (const k of customKeys) {
    const cid = k?.clientId || k?.id;
    const csecret = k?.clientSecret || k?.secret;
    if (cid && csecret && !allUnique.some(x => x.clientId === cid)) {
      allUnique.push({ clientId: cid, clientSecret: csecret });
    }
  }

  const allWithStatus = allUnique.map(keyObj => {
    const { clientId, clientSecret } = keyObj;
    const cached = JDOODLE_KEY_STATUS[clientId] || { status: 'non-finished', used: 0, lastError: null };
    return {
      clientId,
      clientSecret,
      status: cached.status || 'non-finished',
      used: cached.used !== undefined ? cached.used : 0,
      errorReason: cached.lastError || null
    };
  });

  const nonFinished = allWithStatus.filter(r => r.status === 'non-finished');
  const finished = allWithStatus.filter(r => r.status === 'finished');

  return res.json({
    totalCount: allUnique.length,
    nonFinished,
    finished,
    all: allWithStatus
  });
});

app.post('/api/jdoodle/status', async (req, res) => {
  const customKeys = Array.isArray(req.body?.keys) ? req.body.keys : [];
  const allUnique = [...JDOODLE_KEYS];
  for (const k of customKeys) {
    const cid = k?.clientId || k?.id;
    const csecret = k?.clientSecret || k?.secret;
    if (cid && csecret && !allUnique.some(x => x.clientId === cid)) {
      allUnique.push({ clientId: cid, clientSecret: csecret });
    }
  }

  const results = [];
  const chunkSize = 5;
  for (let i = 0; i < allUnique.length; i += chunkSize) {
    const chunk = allUnique.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(async (keyObj) => {
      const { clientId, clientSecret } = keyObj;
      let used = null;
      let status = 'non-finished';
      let errorReason = null;

      if (JDOODLE_KEY_STATUS[clientId]?.status === 'finished') {
        status = 'finished';
        errorReason = JDOODLE_KEY_STATUS[clientId].lastError || 'Quota exhausted during compilation';
      }

      try {
        const resp = await axios.post('https://api.jdoodle.com/v1/credit-spent', { clientId, clientSecret }, { timeout: 10000 });
        if (resp.data && typeof resp.data.used === 'number') {
          used = resp.data.used;
          if (used >= 200) {
            status = 'finished';
            errorReason = `Daily credit quota limit reached (${used}/200 used)`;
          } else if (status !== 'finished') {
            status = 'non-finished';
            errorReason = null;
          }
          JDOODLE_KEY_STATUS[clientId] = { status, used, lastError: errorReason, checkedAt: Date.now() };
        } else if (resp.data?.statusCode === 429 || resp.data?.statusCode === 401 || resp.data?.error) {
          status = 'finished';
          errorReason = resp.data?.error || `Unauthorized or Limit Exceeded (${resp.data?.statusCode})`;
          JDOODLE_KEY_STATUS[clientId] = { status, used: 200, lastError: errorReason, checkedAt: Date.now() };
        }
      } catch (err) {
        const errMsg = err?.response?.data?.error || err?.message;
        if (errMsg && (errMsg.toLowerCase().includes('daily limit') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('401'))) {
          status = 'finished';
          errorReason = errMsg;
          JDOODLE_KEY_STATUS[clientId] = { status, used: 200, lastError: errorReason, checkedAt: Date.now() };
        } else {
          // Keep active status if it's just a rate limit/network timeout when checking credit status
          status = JDOODLE_KEY_STATUS[clientId]?.status || 'non-finished';
          used = JDOODLE_KEY_STATUS[clientId]?.used !== undefined ? JDOODLE_KEY_STATUS[clientId]?.used : 0;
          errorReason = null;
        }
      }

      return {
        clientId,
        clientSecret,
        status: JDOODLE_KEY_STATUS[clientId]?.status || status,
        used: JDOODLE_KEY_STATUS[clientId]?.used !== undefined ? JDOODLE_KEY_STATUS[clientId]?.used : (used !== null ? used : 0),
        errorReason: JDOODLE_KEY_STATUS[clientId]?.lastError || errorReason
      };
    }));
    results.push(...chunkResults);
    if (i + chunkSize < allUnique.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const nonFinished = results.filter(r => r.status === 'non-finished');
  const finished = results.filter(r => r.status === 'finished');

  return res.json({ nonFinished, finished, all: results, totalCount: results.length });
});

app.post('/api/jdoodle/add', (req, res) => {
  const clientId = req.body?.clientId || req.body?.id;
  const clientSecret = req.body?.clientSecret || req.body?.secret;
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'clientId and clientSecret are required' });
  }
  if (!JDOODLE_KEYS.some(k => k.clientId === clientId)) {
    JDOODLE_KEYS.push({ clientId, clientSecret });
    JDOODLE_KEY_STATUS[clientId] = { status: 'non-finished', used: 0, lastError: null, checkedAt: Date.now() };
  }
  return res.json({ success: true, count: JDOODLE_KEYS.length });
});

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
    const dynamicKeys = Array.isArray(req.body.jdoodleKeys) ? req.body.jdoodleKeys : [];
    const mergedKeys = [...JDOODLE_KEYS];
    for (const dk of dynamicKeys) {
      const cid = dk?.clientId || dk?.id;
      const csecret = dk?.clientSecret || dk?.secret;
      if (cid && csecret && !mergedKeys.some(k => k.clientId === cid)) {
        mergedKeys.push({ clientId: cid, clientSecret: csecret });
      }
    }

    for (let i = 0; i < mergedKeys.length; i++) {
      const { clientId, clientSecret } = mergedKeys[i];
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
          JDOODLE_KEY_STATUS[clientId] = { status: 'finished', lastError: lastErrorDetail, checkedAt: Date.now() };
          continue; // Try next API key in the array
        }

        const output = jdResp.data?.output || "No output returned.";
        const isError = jdResp.data?.statusCode !== 200 || output.includes('error:') || output.includes('Exception in thread');
        if (jdResp.data?.statusCode === 200) {
          JDOODLE_KEY_STATUS[clientId] = { status: 'non-finished', lastError: null, checkedAt: Date.now() };
        }

        return res.json({
          program_message: output,
          compiler_error: isError ? output : ""
        });
      } catch (err) {
        const errDetail = err?.response?.data?.error || err?.response?.data?.output || err?.message;
        console.warn(`JDoodle key index [${i}] execution failed:`, errDetail);
        lastErrorDetail = errDetail;
        if (typeof errDetail === 'string' && (errDetail.toLowerCase().includes('limit') || errDetail.toLowerCase().includes('429') || errDetail.toLowerCase().includes('401'))) {
          JDOODLE_KEY_STATUS[clientId] = { status: 'finished', lastError: errDetail, checkedAt: Date.now() };
        }

        // If not the last key, loop to try next key
        if (i < mergedKeys.length - 1) {
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

// Global Express Error Handler to prevent server crashes on malformed requests or unhandled rejections during 200+ user spikes
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err?.message || err);
  res.status(500).json({ error: 'Internal Server Error', detail: err?.message || 'Unexpected server exception occurred.' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log(`JDoodle API Keys Loaded: ${JDOODLE_KEYS.length} keys available for automatic failover.`);
  });
}

// Process-level crash protection for 200+ concurrent compile requests
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception caught:', err?.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at promise:', promise, 'reason:', reason);
});

export default app;

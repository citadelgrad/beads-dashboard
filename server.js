const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const minimist = require('minimist');

const { exec } = require('child_process');

const args = minimist(process.argv.slice(2));
const projectRoot = args._[0] || process.cwd();
const PORT = args.port || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Path to .beads directory
const beadsDir = path.join(projectRoot, '.beads');

console.log(`Starting Beads Dashboard...`);
console.log(`Watching directory: ${projectRoot}`);

// Helper to read all JSONL files in .beads
async function readBeadsData() {
  const issuesFile = path.join(beadsDir, 'issues.jsonl');
  if (!fs.existsSync(issuesFile)) {
    return [];
  }

  const allIssues = [];
  const fileStream = fs.createReadStream(issuesFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        allIssues.push(JSON.parse(line));
      } catch (e) {
        console.error(`Error parsing line in issues.jsonl:`, e.message);
      }
    }
  }
  return allIssues;
}

// API Endpoint
app.get('/api/data', async (req, res) => {
  try {
    const data = await readBeadsData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/issues/:id', async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  
  // Write desc to temp file to avoid escaping issues
  const tempFile = path.join(__dirname, `desc-${Date.now()}.txt`);
  fs.writeFileSync(tempFile, description);

  exec(`bd update ${id} --body-file "${tempFile}"`, { cwd: projectRoot }, (error, stdout, stderr) => {
    fs.unlinkSync(tempFile); // cleanup
    
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ error: stderr || error.message });
    }
    res.json({ success: true });
  });
});

// Watch for changes
if (fs.existsSync(beadsDir)) {
  const watcher = chokidar.watch(beadsDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher.on('all', (event, path) => {
    // Debounce slightly if needed, but for now just emit
    console.log(`File ${event}: ${path}`);
    io.emit('refresh');
  });
} else {
    console.log(`No .beads directory found at ${beadsDir}. Waiting for it to be created...`);
    // Optional: Watch parent to see if .beads is created, but for now we assume it exists or user will restart/create it.
    // Actually, let's watch the root for .beads creation if it doesn't exist
     const watcher = chokidar.watch(projectRoot, {
        depth: 0,
        persistent: true,
        ignoreInitial: true
      });
      watcher.on('addDir', (dirPath) => {
          if (path.basename(dirPath) === '.beads') {
              console.log('.beads directory created! Restarting watcher...');
              io.emit('refresh');
              // Ideally we'd attach the specific watcher here, but for a POC, a simple refresh signal is enough
              // to tell the client "try again".
          }
      });
}

// Socket connection
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

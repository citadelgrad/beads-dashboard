const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));
const projectRoot = args._[0] || process.cwd();
const PORT = args.port || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Path to .beads directory
const beadsDir = path.join(projectRoot, '.beads');

console.log(`Starting Beads Dashboard...`);
console.log(`Watching directory: ${projectRoot}`);

// Helper to read all JSONL files in .beads
async function readBeadsData() {
  if (!fs.existsSync(beadsDir)) {
    return [];
  }

  const files = fs.readdirSync(beadsDir).filter(f => f.endsWith('.jsonl'));
  const allIssues = [];

  for (const file of files) {
    const filePath = path.join(beadsDir, file);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          allIssues.push(JSON.parse(line));
        } catch (e) {
          console.error(`Error parsing line in ${file}:`, e.message);
        }
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

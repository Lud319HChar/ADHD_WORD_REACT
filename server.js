const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PROGRESS_FILE = path.join(__dirname, 'data', 'server-progress.json');
const COMMAND_FILE = path.join(__dirname, 'data', 'commands.json');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

function ensureDataDir() {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(PROGRESS_FILE)) fs.writeFileSync(PROGRESS_FILE, '{}', 'utf-8');
    if (!fs.existsSync(COMMAND_FILE)) fs.writeFileSync(COMMAND_FILE, JSON.stringify({ commands: [], lastSeen: 0 }), 'utf-8');
}

function readJSON(filePath) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
    catch { return {}; }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function serveStatic(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
}

function handleAPI(req, res, method, urlPath) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (urlPath === '/api/progress' && method === 'GET') {
        const data = readJSON(PROGRESS_FILE);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
    }
    else if (urlPath === '/api/progress' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const incoming = JSON.parse(body);
                const existing = readJSON(PROGRESS_FILE);

                if (incoming.dirtyWords && incoming.dirtyWords.length > 0) {
                    if (!existing.words) existing.words = [];
                    const wordMap = {};
                    for (const w of existing.words) wordMap[w.id] = w;
                    for (const dw of incoming.dirtyWords) wordMap[dw.id] = dw;
                    existing.words = Object.values(wordMap);
                } else if (incoming.words) {
                    existing.words = incoming.words;
                }
                delete incoming.words;
                delete incoming.dirtyWords;

                const merged = { ...existing, ...incoming };
                merged._lastSync = new Date().toISOString();
                merged._lastSyncFrom = incoming._client || 'unknown';
                writeJSON(PROGRESS_FILE, merged);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, timestamp: merged._lastSync }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
    }
    else if (urlPath === '/api/stats' && method === 'GET') {
        const progress = readJSON(PROGRESS_FILE);
        const stats = {
            totalWords: progress.totalWords || 0,
            todayCount: progress.todayCount || 0,
            knowCount: progress.knowCount || 0,
            unfamiliarCount: progress.unfamiliarCount || 0,
            combo: progress.combo || 0,
            maxCombo: progress.maxCombo || 0,
            currentSpeed: progress.currentSpeed || 1,
            trainMode: progress.trainMode || 'SPEED_REACT',
            masteryRate: progress.totalWords ? Math.round(((progress.knowCount || 0) / progress.totalWords) * 100) : 0,
            lastSync: progress._lastSync || null,
            lastSyncFrom: progress._lastSyncFrom || null
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(stats));
    }
    else if (urlPath === '/api/command' && method === 'GET') {
        const cmdData = readJSON(COMMAND_FILE);
        const newCmds = (cmdData.commands || []).filter(c => c.id > (cmdData.lastSeen || 0));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ commands: newCmds }));
    }
    else if (urlPath === '/api/command' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const cmd = JSON.parse(body);
                const cmdData = readJSON(COMMAND_FILE);
                const newCmd = {
                    id: Date.now(),
                    type: cmd.type || 'message',
                    content: cmd.content || '',
                    from: cmd.from || 'phone',
                    timestamp: new Date().toISOString()
                };
                cmdData.commands.push(newCmd);
                if (cmdData.commands.length > 100) cmdData.commands = cmdData.commands.slice(-100);
                writeJSON(COMMAND_FILE, cmdData);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, id: newCmd.id }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
    }
    else if (urlPath === '/api/command/ack' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { lastSeenId } = JSON.parse(body);
                const cmdData = readJSON(COMMAND_FILE);
                cmdData.lastSeen = lastSeenId || Date.now();
                writeJSON(COMMAND_FILE, cmdData);
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
    }
    else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'API not found' }));
    }
}

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

const server = http.createServer((req, res) => {
    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const urlPath = parsed.pathname;
    const method = req.method.toUpperCase();

    if (urlPath.startsWith('/api/')) {
        handleAPI(req, res, method, urlPath);
        return;
    }

    let filePath = urlPath === '/' ? '/index.html' : urlPath;
    filePath = path.resolve(__dirname, filePath);

    // 防止路径遍历攻击：确保解析后的路径仍在项目目录内
    const rootDir = path.resolve(__dirname);
    if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        serveStatic(res, filePath);
    } else {
        serveStatic(res, path.join(__dirname, 'index.html'));
    }
});

ensureDataDir();

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  CET6 词汇训练系统 - 服务已启动');
    console.log('══════════════════════════════════════════════');
    console.log('');
    console.log(`  电脑访问: http://localhost:${PORT}`);
    console.log(`  手机访问: http://${ip}:${PORT}`);
    console.log('');
    console.log('  手机仪表盘:');
    console.log(`    http://${ip}:${PORT}/mobile-dashboard.html`);
    console.log('');
    console.log('  API 接口:');
    console.log(`    查看进度: GET  http://${ip}:${PORT}/api/stats`);
    console.log(`    查看命令: GET  http://${ip}:${PORT}/api/command`);
    console.log(`    发送命令: POST http://${ip}:${PORT}/api/command`);
    console.log('');
    console.log('  按 Ctrl+C 停止服务');
    console.log('══════════════════════════════════════════════');
    console.log('');
});

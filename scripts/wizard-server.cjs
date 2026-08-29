const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'sonderr');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function encrypt(text, secret) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secret, 'sonderr-salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(hash, secret) {
  const [ivHex, encrypted] = hash.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(secret, 'sonderr-salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(Buffer.from(encrypted, 'hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function getSecret() {
  const machineId = os.hostname() + os.userInfo().username;
  return crypto.createHash('sha256').update(machineId).digest('hex').slice(0, 32);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (url.pathname === '/' || url.pathname === '/setup') {
    const html = fs.readFileSync(path.join(__dirname, '..', 'gui-wizard', 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (url.pathname === '/api/save-config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const config = JSON.parse(body);
        ensureConfigDir();
        const secret = getSecret();
        const encrypted = encrypt(JSON.stringify(config), secret);
        fs.writeFileSync(CONFIG_FILE, encrypted, { mode: 0o600 });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    try {
      if (!fs.existsSync(CONFIG_FILE)) { res.writeHead(404); res.end('{}'); return; }
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
      
      // Try plain JSON first (from Electron app)
      try {
        const parsed = JSON.parse(raw);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(parsed));
        return;
      } catch (e) {
        // If plain JSON fails, try encrypted format
      }
      
      // Try encrypted format
      const secret = getSecret();
      const decrypted = decrypt(raw, secret);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(decrypted);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (url.pathname === '/api/discover-models' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { provider, apiKey } = JSON.parse(body);
        let models = [];
        if (provider === 'openai') {
          const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
          if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
          const data = await res.json();
          models = data.data.filter(m => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('o4')).map(m => ({ id: m.id, name: m.id }));
        } else if (provider === 'anthropic') {
          models = [
            { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
            { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
            { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' }
          ];
        } else if (provider === 'gemini') {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
          const data = await res.json();
          models = (data.models || []).filter(m => m.name.includes('gemini')).map(m => {
            const short = m.name.replace('models/', '');
            return { id: short, name: short.replace('gemini-', 'Gemini ').replace('-latest', '') };
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ models }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

const PORT = process.env.SONDERR_WIZARD_PORT || 17381;
server.listen(PORT, () => console.log(`Sonderr wizard running on http://localhost:${PORT}`));

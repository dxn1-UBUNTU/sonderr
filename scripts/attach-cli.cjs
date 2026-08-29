#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'sonderr-desktop');
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

function getSecret() {
  const machineId = os.hostname() + os.userInfo().username;
  return crypto.createHash('sha256').update(machineId).digest('hex').slice(0, 32);
}

async function discoverModels(provider, apiKey) {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json();
    return data.data.filter(m => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3') || m.id.includes('o4')).map(m => m.id);
  } else if (provider === 'anthropic') {
    return ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219'];
  } else if (provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
    const data = await res.json();
    return (data.models || []).filter(m => m.name.includes('gemini')).map(m => m.name.replace('models/', ''));
  }
  return [];
}

async function main() {
  const args = process.argv.slice(2);
  const provider = args[0];
  const apiKey = args[1];
  const model = args[2];

  if (!provider || !apiKey) {
    console.log('Usage: attach-cli.js <provider> <api_key> [model]');
    console.log('Providers: openai, anthropic, gemini');
    process.exit(1);
  }

  console.log(`Attaching ${provider}...`);

  let selectedModel = model;
  if (!selectedModel) {
    console.log('Discovering available models...');
    try {
      const models = await discoverModels(provider, apiKey);
      if (!models.length) throw new Error('No supported models found');
      selectedModel = models[0];
      console.log(`Found ${models.length} models. Using: ${selectedModel}`);
    } catch (e) {
      console.error(`Model discovery failed: ${e.message}`);
      selectedModel = provider === 'openai' ? 'gpt-4o' : provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gemini-2.5-pro';
      console.log(`Falling back to ${selectedModel}`);
    }
  }

  const config = {
    provider,
    apiKey,
    model: selectedModel,
    updatedAt: new Date().toISOString()
  };

  ensureConfigDir();
  const secret = getSecret();
  const encrypted = encrypt(JSON.stringify(config), secret);
  fs.writeFileSync(CONFIG_FILE, encrypted, { mode: 0o600 });

  console.log(`✓ Saved ${provider} config to ${CONFIG_FILE}`);
  console.log(`  Model: ${selectedModel}`);
}

main().catch(e => { console.error(e); process.exit(1); });

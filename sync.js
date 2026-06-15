/**
 * World Cup Family Challenge — Data Sync
 *
 * Usage:
 *   First time:  node sync.js YOUR_API_KEY
 *   After that:  node sync.js
 *
 * Fetches all WC 2026 matches from football-data.org and embeds them
 * directly into index.html. Open index.html anywhere — no server needed.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const HTML_FILE   = path.join(__dirname, 'index.html');

// ── Get API key ───────────────────────────────────────────────
let apiKey = process.argv[2] || '';

if (!apiKey) {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    apiKey = cfg.apiKey || '';
  } catch {}
}

if (!apiKey) {
  console.error('\n❌  No API key found.\n');
  console.error('    Usage: node sync.js YOUR_API_KEY\n');
  console.error('    Get a free key at https://www.football-data.org/client/register\n');
  process.exit(1);
}

// Save key for next time
fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }, null, 2));

// ── Fetch from football-data.org ──────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'X-Auth-Token': apiKey,
        'User-Agent': 'WorldCupFamilyChallenge/1.0',
      }
    };
    https.get(url, opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('Invalid JSON response')); }
        } else {
          let msg = `HTTP ${res.statusCode}`;
          try { msg += ': ' + (JSON.parse(body).message || body.slice(0, 120)); } catch {}
          reject(new Error(msg));
        }
      });
    }).on('error', reject);
  });
}

// ── Embed data into index.html ────────────────────────────────
function embedData(matches, syncedAt) {
  let html = fs.readFileSync(HTML_FILE, 'utf8');

  const START = '/* __MATCHES_START__ */';
  const END   = '/* __MATCHES_END__ */';

  const block =
    `${START}\n` +
    `window.__MATCHES__   = ${JSON.stringify(matches)};\n` +
    `window.__SYNCED_AT__ = "${syncedAt}";\n` +
    `${END}`;

  const re = /\/\* __MATCHES_START__ \*\/[\s\S]*?\/\* __MATCHES_END__ \*\//;
  if (re.test(html)) {
    html = html.replace(re, block);
  } else {
    console.error('❌  Could not find data markers in index.html. Was the file modified?');
    process.exit(1);
  }

  fs.writeFileSync(HTML_FILE, html, 'utf8');
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('\n⟳  Fetching World Cup 2026 matches...');

  let data;
  try {
    data = await fetchJSON('https://api.football-data.org/v4/competitions/WC/matches');
  } catch (e) {
    console.error(`\n❌  Fetch failed: ${e.message}\n`);
    if (e.message.includes('401')) console.error('    → API key is invalid. Check your key at football-data.org\n');
    if (e.message.includes('403')) console.error('    → Your plan may not include the WC competition. Check football-data.org/tiers\n');
    if (e.message.includes('404')) console.error('    → WC competition not found. It may not be available yet on this API.\n');
    process.exit(1);
  }

  const matches   = data.matches || [];
  const syncedAt  = new Date().toISOString();
  const finished  = matches.filter(m => m.status === 'FINISHED').length;
  const live      = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;
  const upcoming  = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED').length;

  console.log(`✅  Got ${matches.length} matches  (${finished} finished · ${live} live · ${upcoming} upcoming)`);

  embedData(matches, syncedAt);

  console.log(`✅  index.html updated`);
  console.log(`\n    Open index.html in any browser — PC, phone, tablet.`);
  console.log(`    No server needed. Works fully offline.\n`);
  console.log(`    Run again before matches to get latest scores:\n`);
  console.log(`        node sync.js\n`);
}

main();

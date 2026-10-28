// Verbiage pass: EP → LABL, applied only inside JS string literals / template chunks (and the HTML outside <script>).
// usage: node overlay/terms.js in.html out.html
const fs = require('fs');
const acorn = require(__dirname + '/../lint/node_modules/acorn');
const walk = require(__dirname + '/../lint/node_modules/acorn-walk');

// ordered: specific phrases first
const RULES = [
  // PIN wording (one PIN in LABL)
  ['ARENA OR DIRECTOR PIN', 'BOARD MEMBER PIN'],
  ['Arena PIN or Director PIN.', 'Board Member PIN.'],
  ['Arena PIN (or Director PIN).', 'Board Member PIN.'],
  ['🔓 Unlock (Arena PIN)', '🔓 Unlock'],
  ["the referee's Arena PIN", "a Board Member's PIN"],
  [' No Arena PIN set yet: Director › Setup.', ''],
  ['Arena PIN', 'Board Member PIN'],
  ['DIRECTOR PIN', 'BOARD MEMBER PIN'],
  // mission tablet intro
  ['Tap your station, then your class or Not my class. No PIN. A fail costs the same as on your phone: add any Hits or infection to My Hits on your own phone, and hand any payment to the Director.',
   'Tap a station, pick Standard or Hard, and play. A fail locks that station on this tablet for a little while; wins and fails are logged for the Board Members.'],
  // names
  ['Extinction Protocol', 'Louisiana Blaster League'],
  ['EXTINCTION PROTOCOL', 'LOUISIANA BLASTER LEAGUE'],
  ['Scav Base Desk', 'LABL HQ'],
  ['SCAV BASE DESK', 'LABL HQ'],
  ['Scav Base', 'LABL HQ'],
  ['SCAV BASE', 'LABL HQ'],
  ['Scav-rounds', 'Player-rounds'],
  ['SCAV-ROUNDS', 'PLAYER-ROUNDS'],
  [/\bDirectors'/g, "Board Members'"],
  [/\bDirectors\b/g, 'Board Members'],
  [/\bDirector\b/g, 'Board Member'],
  [/\bDIRECTORS\b/g, 'BOARD MEMBERS'],
  [/\bDIRECTOR\b/g, 'BOARD MEMBER'],
  [/\bScavs\b/g, 'Players'],
  [/\bSCAVS\b/g, 'PLAYERS'],
  [/\bScav\b(?!-)/g, 'Player'],          // keeps class names like Ghost-Scav intact (they are keys)
  [/\bSCAV\b/g, 'PLAYER'],
  [/\bSurvivor Points\b/g, 'League Points'],
  [/\bSurvivor Point\b/g, 'League Point'],
  [/\bSURVIVOR POINTS?\b/g, 'LEAGUE POINTS'],
  [/\bEra\b/g, 'Season'],
  [/\bERA\b/g, 'SEASON'],
  [/\bthe referee's\b/g, "the Board Member's"],
  [/\bReferee\b/g, 'Board Member'],
  [/\breferee\b/g, 'Board Member'],
  [/\bObjective terminals\b/g, 'Objective Stations'],
  [/\bobjective terminals\b/g, 'objective stations'],
  [/\bObjective terminal\b/g, 'Objective Station'],
  [/\bobjective terminal\b/g, 'objective station'],
  [/\bobjective-terminal\b/g, 'objective-station'],
  [/\bTerminals\b/g, 'Stations'],
  [/\bterminals\b/g, 'stations'],
  [/\bKiosk\b/g, 'Scoreboard'],
  [/\bMission tablet\b/g, 'Mission Tablet'],
  [/\bMISSION TABLET\b/g, 'MISSION TABLET'],
  [/\bUntrained\b/g, 'Hard mode'],
  [/\bUNTRAINED\b/g, 'HARD MODE'],
  [/\bRun Scav Run\b/g, 'the long game'],
  ['Bullet Ballet', 'Bullet Ballet'],
];
// exact string literals that must never change (keys compared in code)
const KEEP = new Set(['director', 'kiosk', 'arena', 'mtablet', 'games', 'Untrained']);

function swap(s) {
  if (KEEP.has(s)) return s;
  let o = s;
  for (const [a, b] of RULES) o = typeof a === 'string' ? o.split(a).join(b) : o.replace(a, b);
  return o;
}

function rewriteJs(code) {
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 2023, sourceType: 'script', allowReturnOutsideFunction: true, allowHashBang: true }); }
  catch (e) { return code; } // minified libs etc.: leave alone
  const edits = [];
  walk.full(ast, n => {
    if (n.type === 'Literal' && typeof n.value === 'string') {
      const raw = code.slice(n.start, n.end), q = raw[0], inner = raw.slice(1, -1);
      let out = swap(inner);
      if (out !== inner) {
        if (q === "'") out = out.replace(/(^|[^\\])'/g, "$1\\'");
        edits.push([n.start, n.end, q + out + q]);
      }
    } else if (n.type === 'TemplateElement') {
      const inner = code.slice(n.start, n.end), out = swap(inner);
      if (out !== inner) edits.push([n.start, n.end, out]);
    }
  });
  edits.sort((a, b) => b[0] - a[0]);
  let out = code;
  for (const [s, e, r] of edits) out = out.slice(0, s) + r + out.slice(e);
  return out;
}

const [,, inf, outf] = process.argv;
const html = fs.readFileSync(inf, 'utf8');
let n = 0;
const out = html.replace(/(<script(?![^>]*text\/plain)[^>]*>)([\s\S]*?)(<\/script>)/g, (m, a, body, c) => {
  if (body.length > 100000 && (/qrcode/i.test(body.slice(0, 2000)) || /jsQR/.test(body.slice(0, 5000)))) return m;
  const r = rewriteJs(body); if (r !== body) n++;
  return a + r + c;
});
fs.writeFileSync(outf, out);
console.log('terms: rewrote', n, 'script blocks');

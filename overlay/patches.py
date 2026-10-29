# Exact-substring source patches applied by build.py (each must match exactly once).
PATCHES = [
  # --- no classes in LABL: Standard / Hard only
  ('const setName = (G, d) => (G.open ? "Any class" : d === 1 ? G.cls + " only" : "Not my class");',
   'const setName = (G, d) => (d === 1 ? "Standard" : "Hard");'),
  ('''(untrained
? practice
? "NOT MY CLASS · NO COST IN PRACTICE"
: "NOT MY CLASS · FAILING COSTS MORE"
: G.open
? "ANY CLASS"
: G.cls.toUpperCase() + " ONLY") +''',
   '(untrained ? "HARD MODE" : "STANDARD") +'),
  ('G.open ? ["ANY CLASS", "cls"] : d === 1 ? [String(G.cls || "Class").toUpperCase(), "cls"] : ["UNTRAINED", "unt"],',
   'd === 1 ? ["STANDARD", "cls"] : ["HARD", "unt"],'),
  ('"JAMMED: Not-my-class runs are blocked until a " + G.cls + " wins here. A " + G.cls + " from any squad can fix it, or refuse to."',
   '"JAMMED: Hard runs are blocked until a Standard run wins here."'),
  # --- no automatic night rules / red palette flip at sunset
  ('let NIGHT_ON = true;', 'let NIGHT_ON = false;'),
  # --- team colours: Phase 1 keeps EP's RED / BLUE sides (orange and navy stay available for a 3rd/4th side)
  ('const BB_COL = { red: "#ff4a3d", blue: "#3da5ff", gold: "#ffd36a", green: "#62e07a" };',
   'const BB_COL = { red: "#e8322a", blue: "#2f6fe8", gold: "#ffd36a", green: "#62e07a", orange: "#f07820", navy: "#4f8bff" };'),
  # --- day plan defaults: 11:15 start, 5 modes max, briefing only (no lunch/dinner anchors)
  ('''start: "09:00",
end: "21:00",
len: 300, // seconds per round''',
   '''start: "11:15",
end: "17:00",
len: 300, // seconds per round'''),
  ('maxModes: 9, // D-261: modes in a full day at most (3 sets of 3)', 'maxModes: 5, // LABL: 3 to 5 modes a day'),
  ('''heat: "auto", // D-337: the 1–4 p.m. heat block, by the weather ("on" / "off" force it)
// [ARENA · Oct 12]
heads: 0,''', '''heat: "off", // LABL: no weather heat block
// [ARENA · Oct 12]
heads: 0,'''),
  ('lights: false, // battery LED work lights on hand (INFRA-403)', 'lights: true, // LABL: the day ends with the last mode, not at sunset'),
  ('''items: [
{ id: bbId(), k: "brk", kind: "brief", min: first ? BB_DAY.briefFirst : BB_DAY.brief, at: "09:00" },
// D-261: no fixed 1:00 sweep on an arena day; the builder sweeps after every set of 3 modes instead
{ id: bbId(), k: "brk", kind: "lunch", min: 60, at: "13:20" },
{ id: bbId(), k: "brk", kind: "dinner", min: BB_DAY.dinner, at: "17:30" }
]''', '''items: [
{ id: bbId(), k: "brk", kind: "brief", min: first ? BB_DAY.briefFirst : BB_DAY.brief, at: "11:15" }
]'''),
  ('if (p.maxModes == null) p.maxModes = 9;', 'if (p.maxModes == null) p.maxModes = 5;'),
]
# applied to every occurrence
PATCHES_ALL = [
  ('if (rule.jam) t += " It also jams until a " + G.cls + " fixes it.";',
   'if (rule.jam) t += " It also jams until a Standard run wins here.";'),
]
PATCHES += [
  ('NIGHT_ON = v.nightSun == null ? true : !!v.nightSun;', 'NIGHT_ON = v.nightSun == null ? false : !!v.nightSun;'),
  ('ERA = v.era || "Beta";', 'ERA = v.era || "Season 1";'),
  ('let EVENT_SALT = "EP-BETA";', 'let EVENT_SALT = "LABL";'),
  ('era: "Beta",\ndirPin: DIRECTOR_PIN_DEFAULT', 'era: "Season 1",\ndirPin: DIRECTOR_PIN_DEFAULT'),
]
PATCHES_ALL += [
  ('BB_MODES.filter(', 'lablModes().filter('),
]

PATCHES += [('"BLOOD GHOUL RUSTY FLESH SKULL BONES TEETH WOUND KNIFE SCRAP TORCH FERAL TOXIN SPORE CRYPT GRAVE STEEL VALVE RADIO POWER CHAIN BLADE SIREN NERVE VENOM PANIC SMOKE ASHES CRAWL STORM FUNGI SWAMP BURNT DEBRIS CORPSE BUNKER RATION SIGNAL CARBON RUBBLE PLAGUE FUNGUS MUTANT HUNGER MARROW SCREAM BLEACH MORGUE RAIDER WASTES RUSTED HAZARD TOXINS CINDER GUTTER SPINES LOCKED SHROUD SPLINT FEVERS VERMIN ROTTEN STATIC TOWERS VACCINE TETANUS BATTERY SURVIVE CARCASS WARHEAD BUNKERS ANTENNA SHAMBLE REACTOR OUTPOST HORRORS MUTANTS CHARGER SPRINTS CLINGER BLOATER SILENCE LOCKBOX FALLOUT DESPAIR FEVERED BLISTER WASTING ROTTING GASMASK CORRODE SCREAMS SHELTER DRIFTER HUNTERS".split(', '"BLAST DARTS FOAMS ARENA SCORE ROUND MATCH SQUAD TEAMS CREWS CROWN FLAGS RELAY SPAWN GUARD CLIPS SHOTS SPEED CHASE FIELD BAYOU GATOR SWAMP CRAWL CLAWS PINCH SHELL PATCH BUNKER TARGET VOLLEY SPRINT TACKLE ATTACK DEFEND BARREL RELOAD HOPPER BREACH BANNER MEDALS SEASON PLAYER SNIPER FLANKS ESCORT PYLONS LEAGUE BLASTS DODGED RUNNER RESPAWN CAPTURE TRIGGER BLASTER PAYLOAD RECOVER ARMORED BARRIER CHARGER FLAGGED OUTPOST COMMAND DEFENSE OFFENSE RALLIED SCORING RUNNERS DARTING SWEEPER VICTORY CRAWDAD MARSHES PELICAN SHRIMPS BOUDINS".split(')]
PATCHES += [
  ('"Safety first: arm straight up = out of character, the Director\'s whistle stops everything, goggles on in the arena. Then teams and today\'s first modes."',
   '""'),   # Phase 2: the briefing shows LABL's editable opening talk (lablTalkCard) instead of this note
  ('pav120: ["Pavilion 120 × 50", "Dry days: the roof covers the middle 90 × 40; tape the ends and sides."]',
   'pav120: ["Field 100 × 50", "The full arena: pop-up barriers set, spawns at both ends."]'),
  ('pav90: ["Pavilion 90 × 40", "Under the roof: 16 players or fewer, or rain."]',
   'pav90: ["Short field 70 × 50", "Pull the end barriers in: 16 players or fewer."]'),
  ('oak: ["The oak", "When the pavilion is in use for something else."]',
   'oak: ["Half field 50 × 50", "Half the arena: small groups, pistol rounds, story beats."]'),
  ('large: ["Large field (two oaks)", "The large-field battle: Boilerdome between the two live oaks."]',
   'large: ["Open field", "Beyond the barriers: the large-field battle (Boilerdome)."]'),
  ('title: "Bleed the coolant line"', 'title: "Prime the air line"'),
  ('title: "Crack the terminal"', 'title: "Crack the password"'),
  ('title: "Close the wound"', 'title: "Patch the vest"'),
  ('icon: "☣"', 'icon: "⌨"'),
  ('title: "Break the seal"', 'title: "Punch the gate code"'),
  ('title: "Synthesize"', 'title: "Mix the dye pack"'),
]
PATCHES += [
  ('''return el(
"div",
{ class: "bbp-grp" },
el("div", { class: "bbp-lab" }, "Heat block"),''', '''return el(
"div",
{ class: "bbp-grp labl-hide" },
el("div", { class: "bbp-lab" }, "Heat block"),'''),
  ('"Keeps briefing, lunch and dinner; fills up to "', '"Keeps the briefing; fills up to "'),
]
PATCHES_ALL += [
  ('Every block in the plan is done. Sync the rounds (Wi-Fi at Scav Base, or the round codes), then award the event\'s Survivor Point from a Scav Base PC: Arena › Standings.', 'Every block in the plan is done. Check the Rounds tab, then send tonight\'s backup and results to Google Drive.'),
]
PATCHES += [
  ('isKiosk = typeof KO !== "undefined" && Object.keys(KO.su().squads).length;', 'isKiosk = true; // LABL: this tablet is the league record'),
  ('''const L = KO.sp();
tied.forEach(name => {
const q = KO.su().squads[name];
if (!q) return;
q.members.forEach(m => {
const c = KO.char(m.cid);
if (c && !c.dead) L.push({ id: uid(), t: Date.now(), cid: c.id, n: 1, why: "Bullet Ballet top squad", src: "bb", ev: EVENT_SALT });
});
});
picks.forEach(cid => {
const c = KO.char(cid);
if (c && !c.dead) L.push({ id: uid(), t: Date.now(), cid: c.id, n: 1, why: "Bullet Ballet battle MVP", src: "bb", ev: EVENT_SALT });
});
KO.saveSp(L);
const B2 = BBS.get();
B2.award[EVENT_SALT] = { sq: tied.join(" + ") || "—", sqs: tied.slice(), mvps: picks.slice(), t: Date.now() };''',
   '''const B2 = BBS.get();
B2.award[EVENT_SALT] = { sq: tied.join(" + ") || "—", sqs: tied.slice(), mvps: picks.slice(), mvpNames: pickNames.slice(), t: Date.now(), era: ERA };'''),
]
PATCHES_ALL += [
]
PATCHES += [
  # LABL has no economy: a fail costs the lockout only
  ('''function consBox(id, d, o) {
if (!(CONS[id] || {})[d]) return null;''', '''function consBox(id, d, o) {
return null; // LABL: no Hits, materials or infection; the lockout is the cost
if (!(CONS[id] || {})[d]) return null;'''),
]
PATCHES += [
  ('''function officerBox(id, d, won, note, o) {
if (o.practice) return null;''', '''function officerBox(id, d, won, note, o) {
return null; // LABL: no officer abilities
if (o.practice) return null;'''),
]


# --- Phase 0: the end-of-day item offers the backup + CSV share (Settings has the same button)
PATCHES += [
  ('el("h1", {}, "That\'s the day"),\nkp(', 'el("h1", {}, "That\'s the day"),\n(typeof lablDriveButton === "function" ? el("div", { class: "row", style: "margin:8px 0" }, lablDriveButton("☁ Send backup & results to Google Drive")) : ""),\nkp('),
]
# --- Phase 0: no sfx/ folder ships with LABL; never fetch clips next to the page (keeps the synth sounds, no 404s)
PATCHES += [
  (': typeof fetch === "function" && KIT_INLINE.map.clips.indexOf(name) >= 0\n? get("sfx/" + name + ".mp3")', ': false\n? get("sfx/" + name + ".mp3")'),
]

# --- Phase 2: no reset gate. Start round N is ready as soon as the last round is logged (the 10 s UNDO toast stays)
PATCHES += [
  ('const resetWait = run.savedAt && !run.resetDone && Date.now() - run.savedAt < BB_DAY.resetMaxSec * 1000;',
   'const resetWait = false; // LABL: the Board Member taps Start when ready'),
]

# --- Phase 3: breaks are briefing / dart sweep / water / check / custom / reload / Dart sweep & teardown (no lunch, no dinner)
PATCHES += [
  ('''sweep: ["🧹", "Dart sweep", 20],
lunch: ["🍔", "Lunch", 60],
dinner: ["🍽", "Dinner", BB_DAY.dinner],
water: ["💧", "Water & shade", 10],''',
   '''sweep: ["🧹", "Dart sweep", 20],
water: ["💧", "Water & shade", 10],
teardown: ["🧹", "Dart sweep & teardown", 20], // LABL: the last item of every day'''),
  # the zombie switch sits with today's checkboxes in the Day plan
  ('chk("lights", "Work lights on hand"),', 'chk("zombies", "Zombie modes today"),\nchk("lights", "Work lights on hand"),'),
]
# --- Phase 3: with zombie modes off a set is still 3 blocks (objective, elimination, and one more of either), so the
#     dart sweep lands after block 3 as the roadmap says; with zombies on it's EP's objective + elimination + zombie
PATCHES += [
  ('const newSet = () => (setLeft = shuffle(KINDS.filter(k => pools[k].length)));',
   'const newSet = () => (setLeft = pools.z.length ? shuffle(KINDS.filter(k => pools[k].length)) : shuffle(["o", "e", Math.random() < 0.5 ? "o" : "e"].filter(k => pools[k].length)));'),
]

# --- Phase 4: mini-game timing profiles. Every game's clock goes through lablMgTime (arena: 60 s Standard / 45 s Hard cap;
#     story: EP's length). The best arena fits also get fewer steps (lablMgV(story, arena, d)).
PATCHES_RE = [
  (r'TIME = (\[0(?:, \d+){2,3}\])\[d\]', r'TIME = lablMgTime(\1, d)'),
]
PATCHES_SCOPED = [
  ('lock',  '[0, 6, 8][d]',   'lablMgV([0, 6, 8], [0, 4, 4], d)'),      # pins
  ('wire',  '[0, 3, 4][d]',   'lablMgV([0, 3, 4], [0, 2, 2], d)'),      # panels
  ('stack', '[0, 10, 12][d]', 'lablMgV([0, 10, 12], [0, 6, 6], d)'),    # plates
  ('smash', '[0, 3, 5][d]',   'lablMgV([0, 3, 5], [0, 3, 4], d)'),      # hits
  ('pipe',  '[0, 30, 22][d]', 'lablMgV([0, 30, 22], [0, 18, 14], d)'),  # pipes to lay
  ('bypass','[0, 35, 20][d]', 'lablMgV([0, 35, 20], [0, 25, 15], d)'),  # pairs before a shuffle
]
# --- Phase 4: one lockout rule (30 s Standard / 60 s Hard), no win lock; these are const bindings in EP
PATCHES += [
  ('const lockFor = (G, d) => {\nconst id = idOf(G),', 'const lockFor = (G, d) => d === 2 ? 60 : 30; // LABL\nconst EP_lockFor = (G, d) => {\nconst id = idOf(G),'),
  ('const winLockFor = id => {\nconst o = STATION_LOCKS[id],', 'const winLockFor = id => 0; // LABL: the other side plays right after a win\nconst EP_winLockFor = id => {\nconst o = STATION_LOCKS[id],'),
]
PATCHES += [
  ('repeating-linear-gradient(90deg,#9bd45a 0 6px,#4f7a2c 6px 8px)', 'repeating-linear-gradient(90deg,#f07820 0 6px,#9a4d14 6px 8px)'),  # Hold the signal: the upload bar
]
PATCHES_SCOPED += [
  ('tune', 'GC.GREEN', '"#ffd36a"'),   # a locked-on signal glows gold, not CRT green
]

# --- Phase 5: squad standings count competitive rounds only (r.comp is set at save time from the block's chip)
PATCHES += [
  ('const bbSpRound = r => !!r && r.fmt !== "ffa"', 'const bbSpRound = r => !!r && r.comp === true && r.fmt !== "ffa"'),
]
PATCHES += [
  ('"The game is stopped. Everyone picks up darts. Most darts = 1 temporary Survivor Point (a Director gives it at Scav Base: Director › Today › Give temporary SP).",',
   '"The game is stopped. Everyone picks up darts. Most darts collected gets a shout-out at the close.",'),
]

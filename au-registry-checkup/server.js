const express = require("express");
const fs = require("fs");
const path = require("path");
const githubStore = require("./lib/github-store");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "state.json");
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ACTIVITY = 200;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function emptyData() {
  return { checks: {}, activity: [], doneUsers: [], customTeams: [] };
}

// Admins can edit/unmark any registry, not just their own - kept in sync
// with the same list used client-side in public/app.js.
const ADMIN_NAMES = ["Eyasu", "Zemen"];
const isAdmin = name => ADMIN_NAMES.some(admin => admin.toLowerCase() === (name || "").toString().trim().toLowerCase());

const LOGIN_TYPES = ["au-registry-email", "au-domain-account", "old-au-domain-account"];
const DEVICE_TYPES = ["hp-860-laptop", "old-domain-desktop", "dell-laptop"];

// Every Outlook email in this app ends in @africanunion.org - registries
// added at runtime follow the same convention as the built-in list: only
// the local part is ever accepted, the domain is appended here.
const EMAIL_DOMAIN = "@africanunion.org";
function deriveInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  const chars = parts.map(part => part[0]).join("").toUpperCase();
  return chars.slice(0, 4) || "REG";
}

function sanitizeChecklist(checklist) {
  if (!checklist || typeof checklist !== "object") return null;
  const clean = {
    building: (checklist.building || "").toString().trim().slice(0, 120),
    floor: (checklist.floor || "").toString().trim().slice(0, 60),
    office: (checklist.office || "").toString().trim().slice(0, 60),
    fullName: (checklist.fullName || "").toString().trim().slice(0, 120),
    email: (checklist.email || "").toString().trim().slice(0, 160),
    phone: (checklist.phone || "").toString().trim().slice(0, 40),
    login: LOGIN_TYPES.includes(checklist.login) ? checklist.login : "",
    device: DEVICE_TYPES.includes(checklist.device) ? checklist.device : ""
  };
  // Only keep it if every field is actually filled in - a half-filled
  // checklist shouldn't be treated as a completed one.
  const complete = Object.values(clean).every(value => value);
  return complete ? clean : null;
}

// Older data stored a checkbox as a plain boolean; newer data stores
// { checked, by, note, checklist } so we know who checked it, can block
// others from unchecking it, and can attach the office checklist details.
// This reads either shape safely.
function normalizeCheck(raw) {
  if (raw && typeof raw === "object") {
    return { checked: Boolean(raw.checked), by: raw.by || null, note: raw.note || "", checklist: sanitizeChecklist(raw.checklist) };
  }
  return { checked: Boolean(raw), by: null, note: "", checklist: null };
}

function readLocal() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return { checks: raw.checks || {}, activity: raw.activity || [], doneUsers: raw.doneUsers || [], customTeams: raw.customTeams || [] };
  } catch {
    return emptyData();
  }
}

function writeLocal(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// In-memory copy is what every request reads/writes; the local file and
// GitHub are both just backups of it.
let memory = emptyData();

// Live-update: every connected browser holds open an SSE connection here.
// The moment someone toggles a checkbox we push the new state to all of
// them, so other screens update instantly instead of waiting on a poll.
const sseClients = new Set();
function broadcastState() {
  const checks = Object.fromEntries(Object.entries(memory.checks).map(([id, raw]) => [id, normalizeCheck(raw)]));
  const payload = JSON.stringify({ checks, activity: memory.activity.slice(0, 50), doneUsers: memory.doneUsers, customTeams: memory.customTeams });
  for (const res of sseClients) {
    res.write(`data: ${payload}\n\n`);
  }
}

// Serialize GitHub writes so two quick taps can't race each other's sha.
let pushQueue = Promise.resolve();
function queuePush(message) {
  pushQueue = pushQueue
    .then(() => githubStore.pushRemote(memory, message))
    .catch((err) => console.log(`[github-store] push failed: ${err.message}`));
  return pushQueue;
}

async function bootstrapState() {
  memory = readLocal();
  if (!githubStore.enabled) {
    console.log("[github-store] GITHUB_TOKEN/GITHUB_REPO not set - state will NOT survive a redeploy. See README.");
    return;
  }
  try {
    await githubStore.ensureBranch();
    const remote = await githubStore.fetchRemote();
    if (remote) {
      memory = { checks: remote.checks || {}, activity: remote.activity || [], doneUsers: remote.doneUsers || [], customTeams: remote.customTeams || [] };
      writeLocal(memory);
      console.log("[github-store] restored state from GitHub.");
    } else if (Object.keys(memory.checks).length) {
      console.log("[github-store] no remote state yet - seeding it from the local file.");
      await queuePush("Seed checklist state");
    } else {
      console.log("[github-store] connected, nothing to restore yet.");
    }
  } catch (err) {
    console.log(`[github-store] startup sync failed, continuing on local file only: ${err.message}`);
  }
}

app.get("/api/state", (req, res) => {
  const checks = Object.fromEntries(Object.entries(memory.checks).map(([id, raw]) => [id, normalizeCheck(raw)]));
  res.json({ checks, activity: memory.activity.slice(0, 50), doneUsers: memory.doneUsers, customTeams: memory.customTeams, persistent: githubStore.enabled });
});

// Adds a registry that isn't in the built-in list. It's stored server-side
// (shared + persisted the same way as everything else) so once added it
// shows up for every device and can be checked/unchecked exactly like the
// original registries.
app.post("/api/teams", (req, res) => {
  const { name, email, title, who } = req.body || {};
  const cleanName = (name || "").toString().trim().slice(0, 120);
  if (!cleanName) return res.status(400).json({ error: "expected { name }" });

  const emailLocal = (email || "").toString().trim().split("@")[0].slice(0, 120);
  const cleanEmail = emailLocal ? `${emailLocal}${EMAIL_DOMAIN}` : "";
  const cleanTitle = (title || "").toString().trim().slice(0, 120) || cleanName;
  const whoName = (who || "Someone").toString().trim().slice(0, 60) || "Someone";

  const team = {
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    email: cleanEmail,
    title: cleanTitle,
    initials: deriveInitials(cleanName)
  };
  memory.customTeams.push(team);

  const entry = {
    teamId: team.id,
    teamName: team.name,
    checked: false,
    added: true,
    who: whoName,
    note: "",
    at: new Date().toISOString()
  };
  memory.activity.unshift(entry);
  memory.activity = memory.activity.slice(0, MAX_ACTIVITY);

  writeLocal(memory);
  queuePush(`${whoName} added registry ${team.name}`);
  broadcastState();

  res.json({ ok: true, team, entry });
});

app.post("/api/toggle", (req, res) => {
  const { teamId, teamName, checked, who, note, checklist } = req.body || {};
  if (teamId === undefined || teamId === null || typeof checked !== "boolean") {
    return res.status(400).json({ error: "expected { teamId, checked }" });
  }
  const whoName = (who || "Someone").toString().trim().slice(0, 60) || "Someone";
  const current = normalizeCheck(memory.checks[teamId]);

  // Only the person who checked an item - or an admin - may uncheck it.
  // Checking an (already unchecked) item is always allowed.
  if (!checked && current.checked && current.by && current.by !== whoName && !isAdmin(whoName)) {
    return res.status(403).json({ error: "locked", by: current.by });
  }

  const cleanNote = checked ? (note || "").toString().trim().slice(0, 300) : "";
  const cleanChecklist = checked ? sanitizeChecklist(checklist) : null;
  memory.checks[teamId] = { checked, by: checked ? whoName : null, note: cleanNote, checklist: cleanChecklist };
  const entry = {
    teamId,
    teamName: (teamName || String(teamId)).toString().slice(0, 120),
    checked,
    who: whoName,
    note: cleanNote,
    at: new Date().toISOString()
  };
  memory.activity.unshift(entry);
  memory.activity = memory.activity.slice(0, MAX_ACTIVITY);

  writeLocal(memory);
  queuePush(`${entry.who} ${checked ? "checked" : "unchecked"} ${entry.teamName}`);
  broadcastState();

  res.json({ ok: true, entry });
});

// Marks (or un-marks) a person as having finished reviewing the whole list.
// Once two or more distinct names are in this list, every client unlocks
// the "Generate Excel report" button.
app.post("/api/done", (req, res) => {
  const { who } = req.body || {};
  const whoName = (who || "").toString().trim().slice(0, 60);
  if (!whoName) return res.status(400).json({ error: "expected { who }" });

  const idx = memory.doneUsers.findIndex(name => name.toLowerCase() === whoName.toLowerCase());
  if (idx >= 0) {
    memory.doneUsers.splice(idx, 1);
  } else {
    memory.doneUsers.push(whoName);
  }

  writeLocal(memory);
  queuePush(`${whoName} ${idx >= 0 ? "un-marked" : "marked"} review done`);
  broadcastState();

  res.json({ ok: true, doneUsers: memory.doneUsers });
});

// Browsers connect here and keep the connection open; we push a fresh
// state payload down it whenever someone toggles a checkbox.
app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write(": connected\n\n");
  sseClients.add(res);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

app.listen(PORT, async () => {
  await bootstrapState();
  console.log(`AU Registry Checkup listening on port ${PORT}`);
  startSelfPing();
});

// Render's free tier spins a web service down after ~15 minutes with no
// inbound traffic, and cold-starts the next visitor. Pinging our own public
// URL every 10 minutes counts as normal traffic, so the instance never
// idles long enough to be recycled mid-day.
function startSelfPing() {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url) {
    console.log("RENDER_EXTERNAL_URL not set - self-ping disabled (fine for local dev).");
    return;
  }
  console.log(`Self-ping enabled: pinging ${url}/healthz every ${PING_INTERVAL_MS / 60000} minutes.`);
  setInterval(() => {
    fetch(`${url}/healthz`)
      .then(() => console.log(`[self-ping] ok @ ${new Date().toISOString()}`))
      .catch((err) => console.log(`[self-ping] failed: ${err.message}`));
  }, PING_INTERVAL_MS);
}

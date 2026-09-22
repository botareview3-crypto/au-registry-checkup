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
  return { checks: {}, activity: [] };
}

function readLocal() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return { checks: raw.checks || {}, activity: raw.activity || [] };
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
      memory = { checks: remote.checks || {}, activity: remote.activity || [] };
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
  res.json({ checks: memory.checks, activity: memory.activity.slice(0, 50), persistent: githubStore.enabled });
});

app.post("/api/toggle", (req, res) => {
  const { teamId, teamName, checked, who } = req.body || {};
  if (teamId === undefined || teamId === null || typeof checked !== "boolean") {
    return res.status(400).json({ error: "expected { teamId, checked }" });
  }
  memory.checks[teamId] = checked;
  const entry = {
    teamId,
    teamName: (teamName || String(teamId)).toString().slice(0, 120),
    checked,
    who: (who || "Someone").toString().trim().slice(0, 60) || "Someone",
    at: new Date().toISOString()
  };
  memory.activity.unshift(entry);
  memory.activity = memory.activity.slice(0, MAX_ACTIVITY);

  writeLocal(memory);
  queuePush(`${entry.who} ${checked ? "checked" : "unchecked"} ${entry.teamName}`);

  res.json({ ok: true, entry });
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

// Free, durable persistence with no extra signup: the checklist state is
// committed as JSON to a dedicated branch (not the deploy branch) of the
// same GitHub repo the app is already deployed from. That branch is never
// built or deployed by Render - it's used purely as a free, versioned
// data store that survives redeploys and instance restarts.
//
// Configure with these env vars on Render (see README):
//   GITHUB_TOKEN        fine-grained PAT, Contents: Read & write, this repo only
//   GITHUB_REPO         "owner/repo"
//   GITHUB_DATA_BRANCH  optional, defaults to "data-store"
//   GITHUB_STATE_PATH   optional, defaults to "data/state.json"
//
// If GITHUB_TOKEN or GITHUB_REPO is missing, every function below is a
// no-op and `enabled` is false - the app still runs fine on the local
// disk cache alone, it just won't survive a redeploy (same as before).

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_DATA_BRANCH || "data-store";
const GITHUB_PATH = process.env.GITHUB_STATE_PATH || "data/state.json";
const API = "https://api.github.com";

const enabled = Boolean(GITHUB_TOKEN && GITHUB_REPO);
let cachedSha = null;

function headers() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function ensureBranch() {
  if (!enabled) return;
  const check = await fetch(`${API}/repos/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH}`, { headers: headers() });
  if (check.ok) return;

  const repoRes = await fetch(`${API}/repos/${GITHUB_REPO}`, { headers: headers() });
  if (!repoRes.ok) throw new Error(`could not read repo (${repoRes.status})`);
  const repoInfo = await repoRes.json();
  const defaultBranch = repoInfo.default_branch || "main";

  const baseRefRes = await fetch(`${API}/repos/${GITHUB_REPO}/git/ref/heads/${defaultBranch}`, { headers: headers() });
  if (!baseRefRes.ok) throw new Error(`could not read base branch (${baseRefRes.status})`);
  const baseRef = await baseRefRes.json();

  const createRes = await fetch(`${API}/repos/${GITHUB_REPO}/git/refs`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${GITHUB_BRANCH}`, sha: baseRef.object.sha })
  });
  if (!createRes.ok && createRes.status !== 422) {
    throw new Error(`could not create "${GITHUB_BRANCH}" branch (${createRes.status})`);
  }
}

async function fetchRemote() {
  if (!enabled) return null;
  const res = await fetch(`${API}/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`read failed (${res.status})`);
  const json = await res.json();
  cachedSha = json.sha;
  return JSON.parse(Buffer.from(json.content, "base64").toString("utf8"));
}

async function putContent(data, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
    branch: GITHUB_BRANCH
  };
  if (cachedSha) body.sha = cachedSha;
  return fetch(`${API}/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function pushRemote(data, message) {
  if (!enabled) return;
  let res = await putContent(data, message || "Update checklist state");
  if (res.status === 409 || res.status === 422) {
    // Our cached sha is stale (e.g. another instance wrote in between) - refetch once and retry.
    const fresh = await fetch(`${API}/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`, { headers: headers() });
    if (fresh.ok) {
      cachedSha = (await fresh.json()).sha;
      res = await putContent(data, message || "Update checklist state");
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`write failed (${res.status}) ${text}`);
  }
  const json = await res.json();
  cachedSha = json.content && json.content.sha;
}

module.exports = { enabled, ensureBranch, fetchRemote, pushRemote };

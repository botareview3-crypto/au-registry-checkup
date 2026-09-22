const teams = [
  ["ARBE-Registry", "ARBE-Registry@AfricanUnion.org", "ARBE", "ARBE Registry"],
  ["AUDA-Registry", "AUDA-Registry@africanunion.org", "AUDA", "AUDA/NEPAD Unit"],
  ["CDCP-Registry", "CDCP-Registry@AfricanUnion.org", "CDCP", "Cabinet of the Deputy Chairperson"],
  ["CIDO-Registry", "CIDO-Registry@AfricanUnion.org", "CIDO", "Citizens and Diaspora Directorate"],
  ["CISSA-Registry", "CISSA-Registry@africanunion.org", "CISSA", "CISSA Liaison Unit"],
  ["DCMP-Registry", "DCMP-Registry@AfricanUnion.org", "DCMP", "Conference Management"],
  ["EIS-Registry", "EIS-Registry@AfricanUnion.org", "EIS", "Ethics, Integrity and Standards"],
  ["ESTI-Registry", "ESTI-Registry@AfricanUnion.org", "ESTI", "Education, Science, Technology and Innovation"],
  ["Ethics Integrity and Standards Directorate", "EISD-Registry@africanunion.org", "EISD", "Ethics Integrity and Standards Directorate"],
  ["ETTIM-EDIT-Registry", "ETTIM-EDIT-Registry@AfricanUnion.org", "EDIT", "Economic Development, Trade, Industry and Mining"],
  ["ETTIM-IMET-Registry", "ETTIM-IMET-Registry@AfricanUnion.org", "IMET", "Industry, Mining and Energy"],
  ["FCU-Registry", "FCU-Registry@africanunion.org", "FCU", "Financial Control Unit"],
  ["Finance-Registry", "Finance-Registry@africanunion.org", "FIN", "Finance Directorate"],
  ["HHS-HHA-Registry", "HHS-HHA-Registry@AfricanUnion.org", "HHA", "Health and Humanitarian Affairs"],
  ["HHS-SDCS-Registry", "HHS-SDCS-Registry@AfricanUnion.org", "SDCS", "Health, Humanitarian Affairs and Social Development"],
  ["HRM-Registry", "HRM-Registry@AfricanUnion.org", "HRM", "Human Resource Management"],
  ["ICD-Registry", "ICD-Registry@AfricanUnion.org", "ICD", "Information and Communication Directorate"],
  ["IE-Registry", "IE-Registry@africanunion.org", "IE", "Infrastructure and Energy"],
  ["Main-Registry", "Main-Registry@AfricanUnion.org", "MAIN", "Main Registry"],
  ["MHSD-Registry", "MHSD-Registry@AfricanUnion.org", "MHSD", "Medical and Health Services"],
  ["MISD Registry", "MIS-Registry@africanunion.org", "MIS", "Management Information Systems"],
  ["ODG-Registry", "ODG-Registry@AfricanUnion.org", "ODG", "Office of the Director General"],
  ["Office of the Secretary to the Commission Registry", "OSC-Registry@africanunion.org", "OSC", "Office of the Secretary to the Commission"],
  ["OIO-Registry", "OIO-Registry@AfricanUnion.org", "OIO", "Office of Internal Oversight"],
  ["OLC-Registry", "OLC-Registry@africanunion.org", "OLC", "Office of the Legal Counsel"],
  ["OSPD-Registry", "OSPD-Registry@africanunion.org", "OSPD", "Office of Strategic Planning and Delivery"],
  ["OSSD-Registry", "OSSD-Registry@africanunion.org", "OSSD", "Operations Support Services Directorate"],
  ["OSSS-Registry", "OSSS-Registry@africanunion.org", "OSSS", "Office for Safety and Security"],
  ["Panstat-Registry", "Panstat-Registry@AfricanUnion.org", "PAN", "Pan-African Statistics"],
  ["PAPS-GCPD-Registry", "PAPS-GCPD-Registry@AfricanUnion.org", "GCPD", "Governance, Conflict Prevention and Democracy"],
  ["PFS-Registry", "PFS-Registry@africanunion.org", "PFS", "Peace Fund Secretariat"],
  ["PMRM-Registry", "PMRM-Registry@AfricanUnion.org", "PMRM", "Partnership Management and Resource Mobilization"],
  ["Protocol-Registry", "Protocol-Registry@africanunion.org", "PRO", "Protocol Directorate"],
  ["QAC-Registry", "QAC-Registry@africanunion.org", "QAC", "Quality Assurance and Compliance"],
  ["SBOEA-Registry", "SBOEA-Registry@africanunion.org", "SBO", "Secretariat to the Board of External Auditors"],
  ["SupplyChain-Registry", "SupplyChain-Registry@africanunion.org", "SC", "Supply Chain Registry"],
  ["WGYD-Registry", "WGYD-Registry@AfricanUnion.org", "WGYD", "Women, Gender and Youth Directorate"]
].map(([name, email, initials, title], id) => ({ id, name, email, initials, title, checked: false }));

const departmentRules = [
  ["Governance & Leadership", ["ODG", "OSC", "CDCP", "ODG", "SBO", "OLC", "OIO"]],
  ["Operations & Support", ["DCMP", "OSSD", "OSSS", "PRO", "SC", "MAIN", "QAC"]],
  ["Finance & Resources", ["FCU", "FIN", "PMRM", "PFS"]],
  ["Health & Social Development", ["HHA", "SDCS", "MHSD", "WGYD"]],
  ["Knowledge & Technology", ["ICD", "MIS", "ESTI", "PAN", "ARBE"]],
  ["Peace & Security", ["CISSA", "GCPD", "AUDA", "CIDO", "PAPS"]],
  ["Economic Development", ["EDIT", "IMET", "IE"]],
  ["Ethics & Compliance", ["EIS", "EISD", "HRM"]]
];

const $ = selector => document.querySelector(selector);

const stateKey = "au-registry-checks"; // legacy cache key, still used as an offline fallback
const userKey = "au-registry-user";
let myName = (localStorage.getItem(userKey) || "").trim();
let lastSeenActivityAt = localStorage.getItem("au-registry-activity-seen") || null;
let latestActivity = [];

// The checklist state lives on the server (shared across every phone/device).
// localStorage is kept as an instant-load cache and an offline fallback.
const syncStatus = { state: "idle" }; // idle | syncing | synced | offline
function setSyncStatus(next) {
  syncStatus.state = next;
  const el = document.getElementById("syncStatus");
  if (!el) return;
  const labels = { idle: "Loading…", syncing: "Saving…", synced: "Synced with team", offline: "Saved on this device only" };
  el.textContent = labels[next] || "";
  el.classList.toggle("offline", next === "offline");
}

function initials(name) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0].toUpperCase()).join("") || "?";
}
function renderUserChip() {
  $("#userInitials").textContent = myName ? initials(myName) : "?";
  $("#userNameLabel").textContent = myName || "Set your name";
}
function openNameModal() { $("#nameInput").value = myName; $("#nameOverlay").classList.add("open"); $("#nameInput").focus(); }
function closeNameModal() { $("#nameOverlay").classList.remove("open"); }
function saveName() {
  const value = ($("#nameInput").value || "").trim();
  if (!value) return;
  myName = value.slice(0, 60);
  localStorage.setItem(userKey, myName);
  renderUserChip();
  closeNameModal();
}
$("#userChip").addEventListener("click", openNameModal);
$("#nameSave").addEventListener("click", saveName);
$("#nameInput").addEventListener("keydown", e => { if (e.key === "Enter") saveName(); });
renderUserChip();
if (!myName) openNameModal();

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
function renderActivity() {
  const list = $("#activityList");
  if (!latestActivity.length) { list.innerHTML = `<p class="activity-empty">No activity yet.</p>`; return; }
  list.innerHTML = latestActivity.map(entry => `
    <div class="activity-item ${entry.checked ? "" : "unchecked"}">
      <i class="activity-dot"></i>
      <div class="activity-text">
        <span><b>${escapeHtml(entry.who)}</b> ${entry.checked ? "checked" : "unchecked"} <b>${escapeHtml(entry.teamName)}</b></span>
        <span class="activity-time">${timeAgo(entry.at)}</span>
      </div>
    </div>`).join("");
}
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

function showToast(entry) {
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${escapeHtml(entry.who)}</b> ${entry.checked ? "checked" : "unchecked"} ${escapeHtml(entry.teamName)}`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 4000);
}

function openActivityPanel() {
  $("#activityPanel").classList.add("open");
  $("#activityOverlay").classList.add("open");
  lastSeenActivityAt = latestActivity[0] ? latestActivity[0].at : new Date().toISOString();
  localStorage.setItem("au-registry-activity-seen", lastSeenActivityAt);
  $("#notifButton").classList.remove("has-activity");
}
function closeActivityPanel() { $("#activityPanel").classList.remove("open"); $("#activityOverlay").classList.remove("open"); }
$("#notifButton").addEventListener("click", openActivityPanel);
$("#activityClose").addEventListener("click", closeActivityPanel);
$("#activityOverlay").addEventListener("click", closeActivityPanel);

function applyServerState(data) {
  teams.forEach(team => { team.checked = Boolean(data.checks[team.id]); });
  localStorage.setItem(stateKey, JSON.stringify(data.checks));

  const previousNewest = latestActivity[0] ? latestActivity[0].at : null;
  latestActivity = data.activity || [];
  const unseen = latestActivity.filter(entry => (!lastSeenActivityAt || entry.at > lastSeenActivityAt) && entry.who !== myName);
  if (previousNewest !== null) {
    // Only toast for activity that arrived after our very first load, and not our own actions.
    unseen.filter(entry => (!previousNewest || entry.at > previousNewest)).slice(0, 3).forEach(showToast);
  }
  if (unseen.length && !$("#activityPanel").classList.contains("open")) {
    $("#notifButton").classList.add("has-activity");
  }
  renderActivity();
}

function loadStateFromServer() {
  return fetch("/api/state")
    .then(res => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
    .then(data => { applyServerState(data); setSyncStatus("synced"); update(); })
    .catch(() => setSyncStatus("offline"));
}

function toggleTeam(team) {
  team.checked = !team.checked;
  const snapshot = Object.fromEntries(teams.map(item => [item.id, item.checked]));
  localStorage.setItem(stateKey, JSON.stringify(snapshot));
  setSyncStatus("syncing");
  fetch("/api/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: team.id, teamName: team.name, checked: team.checked, who: myName || "Someone" })
  })
    .then(res => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
    .then(({ entry }) => {
      setSyncStatus("synced");
      latestActivity = [entry, ...latestActivity].slice(0, 50);
      renderActivity();
    })
    .catch(() => setSyncStatus("offline"));
}

// Pick up changes made from other phones instantly, without needing a
// manual refresh: the server pushes state over this connection the moment
// anyone toggles a checkbox.
function connectLiveUpdates() {
  const source = new EventSource("/api/events");
  source.onmessage = event => {
    try {
      applyServerState(JSON.parse(event.data));
      setSyncStatus("synced");
      update();
    } catch {
      // ignore malformed/heartbeat frames
    }
  };
  source.onerror = () => {
    // Connection dropped (e.g. Render restart, network blip). The browser
    // auto-retries EventSource on its own; the 20s poll below is a safety
    // net in case that retry takes a while.
    setSyncStatus("offline");
  };
}
connectLiveUpdates();

// Fallback poll in case the live connection above is down for a while.
setInterval(() => {
  if (document.hidden) return;
  loadStateFromServer();
}, 20000);

let activeView = "overview";
let activeDepartment = null;
let statusFilter = "all";

const departmentFor = team => {
  const found = departmentRules.find(([, codes]) => codes.includes(team.initials));
  return found ? found[0] : "General Registry";
};
const visibleTeams = () => {
  const query = ($("#searchInput").value || "").toLowerCase().trim();
  return teams.filter(team => {
    const matchesView = activeView === "pending" ? !team.checked : activeView === "done" ? team.checked : true;
    const matchesDept = !activeDepartment || departmentFor(team) === activeDepartment;
    const matchesStatus = statusFilter === "checked" ? team.checked : statusFilter === "unchecked" ? !team.checked : true;
    const matchesSearch = !query || `${team.name} ${team.email} ${team.title} ${departmentFor(team)}`.toLowerCase().includes(query);
    return matchesView && matchesDept && matchesStatus && matchesSearch;
  });
};
const grouped = list => list.reduce((groups, team) => {
  const key = departmentFor(team);
  (groups[key] ||= []).push(team);
  return groups;
}, {});

function renderDepartments() {
  const counts = teams.reduce((out, team) => { const key = departmentFor(team); out[key] = (out[key] || 0) + 1; return out; }, {});
  $("#departmentNav").innerHTML = Object.entries(counts).map(([name, count]) => `
    <button class="department-item ${activeDepartment === name ? "active" : ""}" data-department="${name}">
      <i class="dept-dot"></i><span>${name}</span><small class="dept-number">${count}</small>
    </button>`).join("");
  document.querySelectorAll("[data-department]").forEach(button => button.addEventListener("click", () => {
    activeDepartment = activeDepartment === button.dataset.department ? null : button.dataset.department;
    activeView = "overview"; update();
    if (window.innerWidth <= 850) closeMenu();
  }));
}

function renderGroups() {
  const list = visibleTeams();
  const groups = grouped(list);
  $("#registryGroups").innerHTML = list.length ? Object.entries(groups).map(([department, members]) => `
    <article class="group-card">
      <div class="group-heading"><i class="group-color"></i><h3>${department}</h3><small>${members.length} ${members.length === 1 ? "registry" : "registries"}</small></div>
      ${members.map(team => `
        <div class="registry-row ${team.checked ? "checked" : ""}">
          <div class="initials">${team.initials}</div>
          <div class="registry-name"><strong>${team.name}</strong><span>${team.email}</span></div>
          <div class="job-title">${team.title}</div>
          <button class="check-button ${team.checked ? "checked" : ""}" data-check="${team.id}" aria-label="Mark ${team.name} as checked">${team.checked ? "✓" : ""}</button>
        </div>`).join("")}
    </article>`).join("") : `<div class="empty-state"><strong>No registries found</strong>Try another search or clear your filters.</div>`;
  document.querySelectorAll("[data-check]").forEach(button => button.addEventListener("click", () => {
    const team = teams.find(item => item.id === Number(button.dataset.check));
    toggleTeam(team);
    update();
  }));
}

function update() {
  const total = teams.length, done = teams.filter(team => team.checked).length;
  const percent = Math.round(done / total * 100);
  $("#allCount").textContent = total; $("#pendingCount").textContent = total - done; $("#doneCount").textContent = done;
  $("#progressText").textContent = `${percent}%`; $("#totalText").textContent = total; $("#remainingText").textContent = total - done;
  $("#progressRing").parentElement.style.background = `conic-gradient(#83c8af ${percent * 3.6}deg, #386c65 0deg)`;
  const title = activeDepartment || (activeView === "pending" ? "Needs checkup" : activeView === "done" ? "Completed registries" : "All registries");
  $("#sectionTitle").innerHTML = `${title} <span id="sectionCount">${visibleTeams().length}</span>`;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === activeView && !activeDepartment));
  renderDepartments(); renderGroups();
}

function closeMenu() { $("#sidebar").classList.remove("open"); $("#mobileOverlay").classList.remove("open"); }
$("#searchInput").addEventListener("input", renderGroups);
$("#filterButton").addEventListener("click", () => $("#filterPopover").classList.toggle("open"));
document.querySelectorAll(".filter-option").forEach(option => option.addEventListener("click", () => {
  statusFilter = option.dataset.filter;
  document.querySelectorAll(".filter-option").forEach(item => item.classList.toggle("selected", item === option));
  $("#filterPopover").classList.remove("open"); renderGroups();
}));
document.querySelectorAll(".nav-item").forEach(item => item.addEventListener("click", () => {
  activeView = item.dataset.view; activeDepartment = null; update();
  if (window.innerWidth <= 850) closeMenu();
}));
$("#menuButton").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#mobileOverlay").classList.add("open"); });
$("#mobileOverlay").addEventListener("click", closeMenu);
window.addEventListener("storage", event => {
  if (event.key !== stateKey) return;
  const next = JSON.parse(event.newValue || "{}");
  teams.forEach(team => { team.checked = Boolean(next[team.id]); });
  update();
});
update();
loadStateFromServer();

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
].map(([name, email, initials, title], id) => ({ id, name, email, initials, title, checked: false, checkedBy: null, note: "" }));

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
let doneUsers = [];

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

// Optional note, asked for only when checking an item (not when unchecking).
let pendingCheckTeam = null;
function openNoteModal(team) {
  pendingCheckTeam = team;
  $("#noteModalTitle").textContent = `Add a note for ${team.name}?`;
  $("#noteInput").value = "";
  $("#noteOverlay").classList.add("open");
  $("#noteInput").focus();
}
function closeNoteModal() {
  $("#noteOverlay").classList.remove("open");
  pendingCheckTeam = null;
}
$("#noteSkip").addEventListener("click", () => {
  const team = pendingCheckTeam;
  closeNoteModal();
  if (team) { performToggle(team, true, ""); update(); }
});
$("#noteSave").addEventListener("click", () => {
  const team = pendingCheckTeam;
  const text = ($("#noteInput").value || "").trim();
  closeNoteModal();
  if (team) { performToggle(team, true, text); update(); }
});

// Registry office checklist, shown when checking an item. It only marks
// the item as checked once every field is filled in — no separate submit
// step. Partial entries are kept in memory (not sent to the server) so a
// closed-and-reopened form doesn't lose progress.
const checklistDrafts = {};
let pendingChecklistTeam = null;
const LOGIN_TYPES = ["au-registry-email", "au-domain-account"];
const DEVICE_TYPES = ["hp-860-laptop", "old-domain-desktop", "dell-laptop"];
const LOGIN_LABELS = { "au-registry-email": "African Union Registry Email", "au-domain-account": "AU Domain Account" };
const DEVICE_LABELS = { "hp-860-laptop": "AU New HP 860 Laptop", "old-domain-desktop": "AU Old Domain Desktop", "dell-laptop": "AU Dell Laptop" };

function checklistDraftFor(team) {
  return (checklistDrafts[team.id] ||= { building: "", floor: "", office: "", fullName: "", email: "", login: "", device: "" });
}
function readChecklistForm() {
  return {
    building: $("#clBuilding").value.trim(),
    floor: $("#clFloor").value.trim(),
    office: $("#clOffice").value.trim(),
    fullName: $("#clFullName").value.trim(),
    email: $("#clEmail").value.trim(),
    login: (document.querySelector('input[name="clLogin"]:checked') || {}).value || "",
    device: (document.querySelector('input[name="clDevice"]:checked') || {}).value || ""
  };
}
function checklistComplete(draft) {
  return Boolean(draft.building && draft.floor && draft.office && draft.fullName && draft.email && draft.login && draft.device);
}
function openChecklistModal(team) {
  pendingChecklistTeam = team;
  const draft = checklistDraftFor(team);
  $("#checklistModalTitle").textContent = `Registry Office Checklist — ${team.name}`;
  $("#clBuilding").value = draft.building;
  $("#clFloor").value = draft.floor;
  $("#clOffice").value = draft.office;
  $("#clFullName").value = draft.fullName;
  $("#clEmail").value = draft.email;
  document.querySelectorAll('input[name="clLogin"]').forEach(r => { r.checked = r.value === draft.login; });
  document.querySelectorAll('input[name="clDevice"]').forEach(r => { r.checked = r.value === draft.device; });
  updateChecklistHint();
  $("#checklistOverlay").classList.add("open");
  $("#clBuilding").focus();
}
function closeChecklistModal() {
  $("#checklistOverlay").classList.remove("open");
  pendingChecklistTeam = null;
}
function updateChecklistHint() {
  const team = pendingChecklistTeam;
  if (!team) return;
  const draft = readChecklistForm();
  checklistDrafts[team.id] = draft;
  const complete = checklistComplete(draft);
  const hint = $("#clHint");
  hint.textContent = complete ? "All set — marking this registry as checked…" : "Fill in every field to mark this registry checked.";
  hint.classList.toggle("complete", complete);
  if (complete) {
    delete checklistDrafts[team.id];
    closeChecklistModal();
    performToggle(team, true, "", draft);
    update();
  }
}
document.querySelectorAll("#checklistOverlay input").forEach(input => {
  input.addEventListener("input", updateChecklistHint);
  input.addEventListener("change", updateChecklistHint);
});
$("#checklistCancel").addEventListener("click", closeChecklistModal);

function renderSignoff() {
  const namesEl = $("#doneNames");
  const btn = $("#doneButton");
  const exportBtn = $("#exportButton");
  const amDone = Boolean(myName) && doneUsers.some(name => name.toLowerCase() === myName.toLowerCase());
  btn.textContent = amDone ? "Undo my done mark" : "Mark my review as done";
  btn.classList.toggle("done", amDone);
  namesEl.innerHTML = doneUsers.length
    ? `<b>${doneUsers.length}</b> done: ${doneUsers.map(escapeHtml).join(", ")}`
    : "No one has marked done yet.";
  exportBtn.disabled = doneUsers.length < 2;
}
$("#doneButton").addEventListener("click", () => {
  if (!myName) { openNameModal(); return; }
  fetch("/api/done", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ who: myName })
  })
    .then(res => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
    .then(({ doneUsers: next }) => { doneUsers = next; renderSignoff(); })
    .catch(() => {});
});
$("#exportButton").addEventListener("click", () => {
  if ($("#exportButton").disabled) return;
  exportToExcel();
});
function exportToExcel() {
  const rows = teams.map(team => ({
    Registry: team.name,
    Email: team.email,
    Department: departmentFor(team),
    Checked: team.checked ? "Yes" : "No",
    "Checked By": team.checkedBy || "",
    Building: team.checklist?.building || "",
    Floor: team.checklist?.floor || "",
    "Office Number": team.checklist?.office || "",
    "Handler Name": team.checklist?.fullName || "",
    "Handler Email": team.checklist?.email || "",
    "Login Account Type": LOGIN_LABELS[team.checklist?.login] || "",
    "Assigned Device": DEVICE_LABELS[team.checklist?.device] || "",
    Note: team.note || ""
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 42 }, { wch: 34 }, { wch: 26 }, { wch: 9 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 30 }, { wch: 30 }, { wch: 22 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registries");

  const summaryWs = XLSX.utils.json_to_sheet([
    { Field: "Date generated", Value: new Date().toLocaleString() },
    { Field: "Total registries", Value: teams.length },
    { Field: "Checked", Value: teams.filter(t => t.checked).length },
    { Field: "Reviewers marked done", Value: doneUsers.join(", ") }
  ]);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  XLSX.writeFile(wb, `au-registry-checkup-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

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
  teams.forEach(team => {
    const raw = data.checks[team.id];
    const info = raw && typeof raw === "object" ? raw : { checked: Boolean(raw), by: null, note: "", checklist: null };
    team.checked = Boolean(info.checked);
    team.checkedBy = info.by || null;
    team.note = info.note || "";
    team.checklist = info.checklist || null;
  });
  localStorage.setItem(stateKey, JSON.stringify(data.checks));
  doneUsers = data.doneUsers || doneUsers;
  renderSignoff();

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

function performToggle(team, checked, note, checklist) {
  team.checked = checked;
  team.checkedBy = checked ? (myName || "Someone") : null;
  team.note = checked ? (note || "") : "";
  team.checklist = checked ? (checklist || null) : null;
  const snapshot = Object.fromEntries(teams.map(item => [item.id, { checked: item.checked, by: item.checkedBy, note: item.note || "", checklist: item.checklist || null }]));
  localStorage.setItem(stateKey, JSON.stringify(snapshot));
  setSyncStatus("syncing");
  fetch("/api/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: team.id, teamName: team.name, checked: team.checked, who: myName || "Someone", note: team.note, checklist: team.checklist })
  })
    .then(res => {
      if (res.status === 403) {
        return res.json().then(body => Promise.reject(Object.assign(new Error("locked"), { locked: true, by: body.by })));
      }
      return res.ok ? res.json() : Promise.reject(new Error("bad response"));
    })
    .then(({ entry }) => {
      setSyncStatus("synced");
      latestActivity = [entry, ...latestActivity].slice(0, 50);
      renderActivity();
    })
    .catch(err => {
      if (err && err.locked) {
        // Someone else's device beat us to it - snap back to their state.
        team.checked = true;
        team.checkedBy = err.by;
        setSyncStatus("synced");
        update();
        showLockNotice(team);
      } else {
        setSyncStatus("offline");
      }
    });
}

function toggleTeam(team) {
  const wantChecked = !team.checked;

  // Only the person who checked an item can uncheck it.
  if (!wantChecked && team.checked && team.checkedBy && team.checkedBy !== myName) {
    showLockNotice(team);
    return;
  }

  if (wantChecked) {
    // Show the registry office checklist before checking it - performToggle
    // runs automatically once every field in that form is filled in.
    openChecklistModal(team);
    return;
  }

  performToggle(team, false, "");
}

function showLockNotice(team) {
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${escapeHtml(team.checkedBy || "Someone else")}</b> checked this — only they can uncheck it`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 4000);
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
      ${members.map(team => {
        const lockedForMe = team.checked && team.checkedBy && team.checkedBy !== myName;
        return `
        <div class="registry-row ${team.checked ? "checked" : ""}">
          <div class="initials">${team.initials}</div>
          <div class="registry-name">
            <strong>${team.name}</strong>
            <span>${team.email}</span>
            ${team.checked && team.checkedBy ? `<span class="checked-by">Checked by ${escapeHtml(team.checkedBy)}</span>` : ""}
            ${team.checked && team.checklist ? `<span class="checked-by note-text">${escapeHtml(team.checklist.fullName)} · ${escapeHtml(team.checklist.building)}${team.checklist.floor ? `, floor ${escapeHtml(team.checklist.floor)}` : ""}${team.checklist.office ? `, office ${escapeHtml(team.checklist.office)}` : ""}</span>` : ""}
            ${team.checked && team.note ? `<span class="checked-by note-text">“${escapeHtml(team.note)}”</span>` : ""}
          </div>
          <div class="job-title">${team.title}</div>
          <button class="check-button ${team.checked ? "checked" : ""} ${lockedForMe ? "locked" : ""}" data-check="${team.id}" aria-label="${lockedForMe ? `Checked by ${team.checkedBy} - only they can uncheck` : `Mark ${team.name} as checked`}" title="${lockedForMe ? `Checked by ${escapeHtml(team.checkedBy)}` : ""}">${team.checked ? "✓" : ""}</button>
        </div>`;
      }).join("")}
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
  teams.forEach(team => {
    const raw = next[team.id];
    const info = raw && typeof raw === "object" ? raw : { checked: Boolean(raw), by: null, note: "", checklist: null };
    team.checked = Boolean(info.checked);
    team.checkedBy = info.by || null;
    team.note = info.note || "";
    team.checklist = info.checklist || null;
  });
  update();
});
update();
renderSignoff();
loadStateFromServer();

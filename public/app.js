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
].map(([name, email, initials, title], id) => ({ id, name, email, initials, title, checked: false, checkedBy: null, note: "", checklist: null }));

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
// The header showed a hardcoded date that never changed day to day -
// filling it in from the visitor's own clock instead so "today" is
// always actually today.
function renderHeroDate() {
  const el = $("#heroDate");
  if (!el) return;
  el.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
renderHeroDate();
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

// Add a registry that isn't in the built-in list. Posts to the server so
// it's shared with every device right away, then it behaves exactly like
// any other registry (checkbox, checklist, department grouping, export).
function openAddRegistryModal() {
  $("#arName").value = "";
  $("#arTitle").value = "";
  $("#arEmail").value = "";
  $("#arHint").textContent = "It'll appear under \u201CGeneral Registry\u201D until it's grouped elsewhere.";
  $("#arHint").classList.remove("complete");
  $("#addRegistryOverlay").classList.add("open");
  $("#arName").focus();
}
function closeAddRegistryModal() {
  $("#addRegistryOverlay").classList.remove("open");
}
$("#addRegistryButton").addEventListener("click", () => {
  if (!myName) { openNameModal(); return; }
  openAddRegistryModal();
});
$("#addRegistryCancel").addEventListener("click", closeAddRegistryModal);
$("#addRegistrySave").addEventListener("click", () => {
  const name = ($("#arName").value || "").trim();
  if (!name) {
    $("#arHint").textContent = "Registry name is required.";
    $("#arHint").classList.remove("complete");
    $("#arName").focus();
    return;
  }
  const title = ($("#arTitle").value || "").trim();
  const emailLocal = emailLocalPart($("#arEmail").value);
  const saveButton = $("#addRegistrySave");
  saveButton.disabled = true;
  fetch("/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, title, email: emailLocal, who: myName || "Someone" })
  })
    .then(res => (res.ok ? res.json() : Promise.reject(new Error("bad response"))))
    .then(({ team, entry }) => {
      mergeCustomTeams([team]);
      if (entry) { latestActivity = [entry, ...latestActivity].slice(0, 50); renderActivity(); }
      closeAddRegistryModal();
      update();
    })
    .catch(() => {
      $("#arHint").textContent = "Couldn't add it — check your connection and try again.";
      $("#arHint").classList.remove("complete");
    })
    .finally(() => { saveButton.disabled = false; });
});

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
const LOGIN_TYPES = ["au-registry-email", "au-domain-account", "old-au-domain-account"];
const DEVICE_TYPES = ["hp-860-laptop", "old-domain-desktop", "dell-laptop"];
const LOGIN_LABELS = { "au-registry-email": "African Union Registry Email", "au-domain-account": "New AU Domain Account", "old-au-domain-account": "Old AU Domain Account" };
const DEVICE_LABELS = { "hp-860-laptop": "AU New HP 860 Laptop", "old-domain-desktop": "AU Old Domain Desktop", "dell-laptop": "AU Dell Laptop" };

function checklistDraftFor(team) {
  // Seed the draft from the team's already-saved checklist (edit flow) the
  // first time it's opened, so editing a checked registry starts from what
  // was saved rather than a blank form.
  if (!checklistDrafts[team.id]) {
    checklistDrafts[team.id] = team.checklist
      ? { building: "", floor: "", office: "", fullName: "", email: "", phone: "", login: "", device: "", ...team.checklist }
      : { building: "", floor: "", office: "", fullName: "", email: "", phone: "", login: "", device: "" };
  }
  return checklistDrafts[team.id];
}
// Every Outlook email on this checklist ends in @africanunion.org - the
// field only collects the part before the @ and this suffix is appended
// automatically, so it can't be mistyped or left off.
const EMAIL_DOMAIN = "@africanunion.org";
function emailLocalPart(value) {
  // Strip anything the user may have typed after (or including) "@", so
  // pasting a full address still resolves to just the local part.
  return (value || "").trim().split("@")[0];
}
function readChecklistForm() {
  const emailLocal = emailLocalPart($("#clEmail").value);
  return {
    building: $("#clBuilding").value.trim(),
    floor: $("#clFloor").value.trim(),
    office: $("#clOffice").value.trim(),
    fullName: $("#clFullName").value.trim(),
    email: emailLocal ? `${emailLocal}${EMAIL_DOMAIN}` : "",
    phone: $("#clPhone").value.trim(),
    login: (document.querySelector('input[name="clLogin"]:checked') || {}).value || "",
    device: (document.querySelector('input[name="clDevice"]:checked') || {}).value || ""
  };
}
function checklistComplete(draft) {
  return Boolean(draft.building && draft.floor && draft.office && draft.fullName && draft.email && draft.phone && draft.login && draft.device);
}
function openChecklistModal(team) {
  pendingChecklistTeam = team;
  const draft = checklistDraftFor(team);
  $("#checklistModalTitle").textContent = `${team.checked ? "Edit" : "Registry Office"} Checklist — ${team.name}`;
  $("#clBuilding").value = draft.building;
  $("#clFloor").value = draft.floor;
  $("#clOffice").value = draft.office;
  $("#clFullName").value = draft.fullName;
  $("#clEmail").value = emailLocalPart(draft.email);
  $("#clPhone").value = draft.phone;
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
  hint.textContent = complete ? "All set — click Save to mark this registry checked." : "Fill in every field, then click Save.";
  hint.classList.toggle("complete", complete);
  $("#checklistSave").disabled = !complete;
}
document.querySelectorAll("#checklistOverlay input").forEach(input => {
  input.addEventListener("input", updateChecklistHint);
});
$("#checklistCancel").addEventListener("click", closeChecklistModal);
$("#checklistSave").addEventListener("click", () => {
  const team = pendingChecklistTeam;
  if (!team) return;
  const draft = readChecklistForm();
  if (!checklistComplete(draft)) return;
  delete checklistDrafts[team.id];
  closeChecklistModal();
  performToggle(team, true, team.note || "", draft);
  update();
});

// Read-only view shown when clicking a registry you already checked, with
// Edit (reopens the form pre-filled) and Mark as unchecked actions - so
// clicking a completed row no longer silently wipes its checklist data.
let pendingViewTeam = null;
function checklistViewRows(team) {
  const c = team.checklist || {};
  const location = [c.building, c.floor ? `Floor ${c.floor}` : "", c.office ? `Office ${c.office}` : ""].filter(Boolean).join(", ");
  const rows = [
    ["Handler", c.fullName || "—"],
    ["Email", c.email || "—"],
    ["Phone", c.phone || "—"],
    ["Location", location || "—"],
    ["Login Account Type", LOGIN_LABELS[c.login] || "—"],
    ["Assigned Device", DEVICE_LABELS[c.device] || "—"]
  ];
  if (team.note) rows.push(["Note", team.note]);
  return rows;
}
function openChecklistView(team) {
  pendingViewTeam = team;
  $("#checklistViewTitle").textContent = team.name;
  $("#clViewCheckedBy").textContent = team.checkedBy ? `Checked by ${team.checkedBy}` : "";
  $("#checklistViewBody").innerHTML = checklistViewRows(team).map(([label, value]) => `
    <div class="cl-view-row"><span class="cl-view-label">${escapeHtml(label)}</span><span class="cl-view-value">${escapeHtml(value)}</span></div>`).join("");
  $("#checklistViewOverlay").classList.add("open");
}
function closeChecklistView() {
  $("#checklistViewOverlay").classList.remove("open");
  pendingViewTeam = null;
}
$("#checklistViewClose").addEventListener("click", closeChecklistView);
$("#checklistViewEdit").addEventListener("click", () => {
  const team = pendingViewTeam;
  closeChecklistView();
  if (team) openChecklistModal(team);
});
$("#checklistViewUncheck").addEventListener("click", () => {
  const team = pendingViewTeam;
  closeChecklistView();
  if (team) { performToggle(team, false, ""); update(); }
});

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
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  // Cells for these columns come from the Registry Office Checklist, which
  // is only filled in once a registry is checked off. Left blank (i.e. the
  // registry is still pending), the cell gets a red fill so it's obvious
  // at a glance in the spreadsheet which registries still need that info.
  const RED_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
  const checklistKeys = new Set(["building", "floor", "office", "handlerName", "handlerEmail", "handlerPhone", "login", "device"]);

  // Phone numbers that are mostly placeholder zeros (e.g. "000 000 0000")
  // or too short to be real (fewer than 5 digits) aren't useful - swap
  // those in for a clear note instead of passing the junk value through.
  // Local numbers are written with a leading 0 (e.g. 0923447817) - swap
  // that for the +251 country code so every number in the report is in a
  // consistent, dialable format (e.g. +251923447817).
  function sanitizePhone(phone) {
    const raw = (phone || "").trim();
    if (!raw) return "";
    let digits = raw.replace(/\D/g, "");
    const zeroCount = (digits.match(/0/g) || []).length;
    if (zeroCount > 3 || digits.length < 5) return "No number provided";
    if (digits.startsWith("0")) digits = `251${digits.slice(1)}`;
    return `+${digits}`;
  }

  const ws = workbook.addWorksheet("Registries");
  ws.columns = [
    { header: "Registry", key: "registry", width: 42 },
    { header: "Email", key: "email", width: 34 },
    { header: "Building", key: "building", width: 22 },
    { header: "Floor", key: "floor", width: 12 },
    { header: "Office Number", key: "office", width: 14 },
    { header: "Handler Name", key: "handlerName", width: 24 },
    { header: "Handler Email", key: "handlerEmail", width: 30 },
    { header: "Handler Phone", key: "handlerPhone", width: 18 },
    { header: "Login Account Type", key: "login", width: 30 },
    { header: "Assigned Device", key: "device", width: 22 },
    { header: "Note", key: "note", width: 40 }
  ];
  ws.getRow(1).font = { bold: true };

  teams.forEach(team => {
    const row = ws.addRow({
      registry: team.name,
      email: team.email,
      building: team.checklist?.building || "",
      floor: team.checklist?.floor || "",
      office: team.checklist?.office || "",
      handlerName: team.checklist?.fullName || "",
      handlerEmail: team.checklist?.email || "",
      handlerPhone: sanitizePhone(team.checklist?.phone),
      login: LOGIN_LABELS[team.checklist?.login] || "",
      device: DEVICE_LABELS[team.checklist?.device] || "",
      note: team.note || ""
    });
    checklistKeys.forEach(key => {
      const cell = row.getCell(key);
      if (!cell.value) cell.fill = RED_FILL;
    });
  });

  const summaryWs = workbook.addWorksheet("Summary");
  summaryWs.columns = [{ header: "Field", key: "field", width: 26 }, { header: "Value", key: "value", width: 40 }];
  summaryWs.getRow(1).font = { bold: true };
  summaryWs.addRow({ field: "Date generated", value: new Date().toLocaleString() });
  summaryWs.addRow({ field: "Total registries", value: teams.length });
  summaryWs.addRow({ field: "Checked", value: teams.filter(t => t.checked).length });
  summaryWs.addRow({ field: "Reviewers marked done", value: doneUsers.join(", ") });

  workbook.xlsx.writeBuffer().then(buffer => {
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `au-registry-checkup-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
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
    <div class="activity-item ${entry.added ? "" : entry.checked ? "" : "unchecked"}">
      <i class="activity-dot"></i>
      <div class="activity-text">
        <span><b>${escapeHtml(entry.who)}</b> ${entry.added ? "added" : entry.checked ? "checked" : "unchecked"} <b>${escapeHtml(entry.teamName)}</b></span>
        <span class="activity-time">${timeAgo(entry.at)}</span>
      </div>
    </div>`).join("");
}
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }

function showToast(entry) {
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${escapeHtml(entry.who)}</b> ${entry.added ? "added" : entry.checked ? "checked" : "unchecked"} ${escapeHtml(entry.teamName)}`;
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

// Registries added at runtime (via the "+ Add registry" button) live on the
// server alongside checks/activity, so every device sees them. This merges
// any not-yet-seen ones from the server into the local `teams` array - it
// only ever pushes new entries, never rebuilds the array, so every other
// function that closed over `teams` keeps working unchanged.
const knownCustomIds = new Set();
function mergeCustomTeams(customTeams) {
  (customTeams || []).forEach(custom => {
    if (knownCustomIds.has(custom.id)) return;
    knownCustomIds.add(custom.id);
    teams.push({
      id: custom.id,
      name: custom.name,
      email: custom.email || "",
      initials: custom.initials || "REG",
      title: custom.title || custom.name,
      checked: false,
      checkedBy: null,
      note: "",
      checklist: null
    });
  });
}

function applyServerState(data) {
  mergeCustomTeams(data.customTeams);
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
  if (team.checked) {
    // Only the person who checked an item can view/edit or unmark it.
    if (team.checkedBy && team.checkedBy !== myName) {
      showLockNotice(team);
      return;
    }
    // Clicking a checked item shows its saved details, with Edit and
    // Mark-as-unchecked actions - it no longer unchecks (and wipes the
    // checklist) on a plain click.
    openChecklistView(team);
    return;
  }

  // Show the registry office checklist before checking it - Save runs once
  // every field in the form is filled in.
  openChecklistModal(team);
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
        <div class="registry-row ${team.checked ? "checked" : ""}" data-row="${team.id}">
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
  // Clicking anywhere on a row opens the same checklist/toggle flow as the
  // checkbox. The checkbox itself is skipped here since its own listener
  // (attached below) already handles it - without the skip, a click on the
  // checkbox would bubble up to the row and fire toggleTeam twice.
  document.querySelectorAll("[data-row]").forEach(row => row.addEventListener("click", event => {
    if (event.target.closest("[data-check]")) return;
    // team.id is a plain number for the built-in registries but a string
    // (e.g. "custom-abc123-xy9z") for ones added at runtime via "+ Add
    // registry" - dataset values are always strings, so compare as strings
    // rather than coercing with Number(), which turned custom ids into NaN
    // and silently broke clicking/checking them.
    const team = teams.find(item => String(item.id) === row.dataset.row);
    toggleTeam(team);
    update();
  }));
  document.querySelectorAll("[data-check]").forEach(button => button.addEventListener("click", () => {
    const team = teams.find(item => String(item.id) === button.dataset.check);
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

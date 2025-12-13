// =========================================================
// JOB STORAGE (per job history)
// =========================================================
const JOBS_KEY = "jobs";
const ACTIVE_JOB_KEY = "activeJobId";
const RATE_KEY = "rate";

let jobs = JSON.parse(localStorage.getItem(JOBS_KEY) || "[]");
let activeJobId = localStorage.getItem(ACTIVE_JOB_KEY) || "";

// =========================================================
// DOM
// =========================================================
const menuBtn = document.getElementById("menuBtn");
const menuBackdrop = document.getElementById("menuBackdrop");
const menuDrawer = document.getElementById("menuDrawer");
const closeMenuBtn = document.getElementById("closeMenuBtn");

const jobBtn = document.getElementById("jobBtn");
const jobNameEl = document.getElementById("jobName");
const jobHint = document.getElementById("jobHint");

const jobModal = document.getElementById("jobModal");
const jobModalTitle = document.getElementById("jobModalTitle");
const jobModalSub = document.getElementById("jobModalSub");
const jobNameInput = document.getElementById("jobNameInput");
const saveJobBtn = document.getElementById("saveJobBtn");
const cancelJobBtn = document.getElementById("cancelJobBtn");

const rateInput = document.getElementById("rateInput");
const rateWrap = document.getElementById("rateWrap");

const app = document.getElementById("app");
const earningsEl = document.getElementById("earnings");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");

const historyBtn = document.getElementById("historyBtn");
const sheetBackdrop = document.getElementById("sheetBackdrop");
const historySheet = document.getElementById("historySheet");
const sheetHeader = document.getElementById("sheetHeader");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");
const jobFilter = document.getElementById("jobFilter");
const sheetTotal = document.getElementById("sheetTotal");

/* Custom filter UI */
const jobFilterBtn = document.getElementById("jobFilterBtn");
const jobFilterLabel = document.getElementById("jobFilterLabel");
const jobFilterModal = document.getElementById("jobFilterModal");
const closeJobFilter = document.getElementById("closeJobFilter");
const jobFilterList = document.getElementById("jobFilterList");

const saveSessionModal = document.getElementById("saveSessionModal");
const tagInput = document.getElementById("tagInput");
const noteInput = document.getElementById("noteInput");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const discardSessionBtn = document.getElementById("discardSessionBtn");

const deleteModal = document.getElementById("deleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const editModal = document.getElementById("editModal");
const editTag = document.getElementById("editTag");
const editDate = document.getElementById("editDate");
const editStart = document.getElementById("editStart");
const editEnd = document.getElementById("editEnd");
const editRate = document.getElementById("editRate");
const editNote = document.getElementById("editNote");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// =========================================================
// STATE
// =========================================================
let running = false;
let startTime = 0;
let accumulated = 0;

let pendingSessionStartISO = null;
let deleteTarget = null;
let editTarget = null;

// Sheet behavior
const SHEET_MIN = 40;
const SHEET_MAX = 85;
const SHEET_CLOSE = 18;

let sheetClosingTimer = null;

// Drag state
let drag = {
  active: false,
  mode: null,
  startY: 0,
  startH: SHEET_MIN,
  startT: 0
};

// =========================================================
// MENU DRAWER
// =========================================================
function openMenu() {
  menuBackdrop.classList.remove("hidden");
  menuDrawer.classList.remove("hidden");
  menuDrawer.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => menuDrawer.classList.add("open"));
}

function closeMenu() {
  menuDrawer.classList.remove("open");
  menuDrawer.setAttribute("aria-hidden", "true");
  menuBackdrop.classList.add("hidden");
  setTimeout(() => {
    menuDrawer.classList.add("hidden");
  }, 220);
}

menuBtn.addEventListener("click", () => openMenu());
menuBackdrop.addEventListener("click", () => closeMenu());
closeMenuBtn.addEventListener("click", () => closeMenu());

// =========================================================
// HELPERS
// =========================================================
function saveJobs() {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

function getJob(jobId) {
  return jobs.find(j => j.id === jobId);
}

function ensureActiveJobValid() {
  if (activeJobId && getJob(activeJobId)) return;
  if (jobs.length > 0) {
    activeJobId = jobs[jobs.length - 1].id;
    localStorage.setItem(ACTIVE_JOB_KEY, activeJobId);
  } else {
    activeJobId = "";
    localStorage.removeItem(ACTIVE_JOB_KEY);
  }
}

function hasActiveJob() {
  return !!(activeJobId && getJob(activeJobId));
}

function lockUI() {
  app.classList.add("locked-ui");
  rateWrap.classList.add("locked-ui");
  historyBtn.disabled = true;
  startBtn.disabled = true;
  rateInput.disabled = true;

  jobHint.classList.remove("hidden");
  jobBtn.classList.add("pulse");
}

function unlockUI() {
  app.classList.remove("locked-ui");
  rateWrap.classList.remove("locked-ui");
  historyBtn.disabled = false;
  startBtn.disabled = false;
  rateInput.disabled = false;

  jobHint.classList.add("hidden");
  jobBtn.classList.remove("pulse");
}

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function getViewportH() {
  return Math.max(1, window.innerHeight || document.documentElement.clientHeight);
}

function setSheetH(vh, snap = false) {
  const v = clamp(vh, SHEET_CLOSE, SHEET_MAX);
  historySheet.style.setProperty("--sheetH", v.toFixed(2));
  if (snap) {
    historySheet.style.transition = "transform 220ms ease, height 180ms ease";
  } else {
    historySheet.style.transition = "transform 220ms ease, height 0ms linear";
  }
}

function restoreSheetTransition() {
  historySheet.style.transition = "transform 220ms ease, height 160ms ease";
}

function formatTime(ms) {
  const s = ms / 1000;
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  const d = String(Math.floor((ms % 1000) / 10)).padStart(2, "0");
  return `${h}:${m}:${sec}.${d}`;
}

function calcEarnings(rate, ms) {
  return (rate / 3600000) * ms;
}

function dateOnly(d) {
  return new Date(d).toLocaleDateString();
}

function timeOnly(d) {
  return new Date(d).toLocaleTimeString();
}

function resetTimerUI() {
  running = false;
  startTime = 0;
  accumulated = 0;
  pendingSessionStartISO = null;

  timerEl.textContent = "00:00:00.00";
  earningsEl.textContent = "$0.00";

  startBtn.textContent = "START";
  startBtn.classList.remove("stop");
  startBtn.classList.add("start");
}

function isScrollable(el) {
  return el && el.scrollHeight > el.clientHeight + 2;
}
function atTop(el) {
  return !el || el.scrollTop <= 1;
}
function atBottom(el) {
  if (!el) return true;
  return (el.scrollTop + el.clientHeight) >= (el.scrollHeight - 1);
}
function isInteractive(target) {
  return !!target.closest("button, input, select, textarea, a");
}

// =========================================================
// JOB MODAL
// =========================================================
function openJobModal() {
  jobNameInput.value = "";
  if (!hasActiveJob()) {
    jobModalTitle.textContent = "Create Job Session";
    jobModalSub.textContent = "Enter a job name to continue.";
  } else {
    jobModalTitle.textContent = "Create New Job Session";
    jobModalSub.textContent = "Creating a new job will switch you to it. Your previous job history stays saved.";
  }
  jobModal.classList.remove("hidden");
  setTimeout(() => jobNameInput.focus(), 50);
}
function closeJobModal() {
  jobModal.classList.add("hidden");
}

// =========================================================
// HISTORY SHEET OPEN/CLOSE
// =========================================================
function openHistorySheet() {
  clearTimeout(sheetClosingTimer);

  sheetBackdrop.classList.remove("hidden");
  historySheet.classList.remove("hidden");

  setSheetH(SHEET_MIN, true);
  restoreSheetTransition();

  requestAnimationFrame(() => {
    historySheet.classList.add("open");
  });
}

function closeHistorySheet() {
  historySheet.classList.remove("open");
  sheetBackdrop.classList.add("hidden");

  sheetClosingTimer = setTimeout(() => {
    historySheet.classList.add("hidden");
    setSheetH(SHEET_MIN, true);
    restoreSheetTransition();
  }, 230);
}

sheetBackdrop.addEventListener("click", () => closeHistorySheet());

// =========================================================
// JOB FILTER (native select kept hidden, custom modal used)
// =========================================================
function setJobFilterLabel() {
  const selected = jobFilter.value || "all";
  if (selected === "all") {
    jobFilterLabel.textContent = "All jobs";
    return;
  }
  const j = getJob(selected);
  jobFilterLabel.textContent = j ? j.name : "All jobs";
}

function openJobFilterModal() {
  buildJobFilterList();
  jobFilterModal.classList.remove("hidden");
}

function closeJobFilterModal() {
  jobFilterModal.classList.add("hidden");
}

function buildJobFilterList() {
  jobFilterList.innerHTML = "";

  const current = jobFilter.value || "all";

  const addItem = (value, title, meta = "") => {
    const row = document.createElement("div");
    row.className = "filter-item" + (current === value ? " active" : "");
    row.dataset.value = value;

    row.innerHTML = `
      <div>${title}</div>
      ${meta ? `<small>${meta}</small>` : `<small></small>`}
    `;
    jobFilterList.appendChild(row);
  };

  addItem("all", "All jobs", `${jobs.length} job${jobs.length === 1 ? "" : "s"}`);

  jobs.forEach(j => {
    const count = (j.history || []).length;
    addItem(j.id, j.name, `${count} session${count === 1 ? "" : "s"}`);
  });
}

// =========================================================
// HISTORY FILTER (populate hidden select)
// =========================================================
function populateJobFilter() {
  jobFilter.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "All jobs";
  jobFilter.appendChild(allOpt);

  jobs.forEach(j => {
    const opt = document.createElement("option");
    opt.value = j.id;
    opt.textContent = j.name;
    jobFilter.appendChild(opt);
  });

  jobFilter.value = hasActiveJob() ? activeJobId : "all";
  setJobFilterLabel();
}

// =========================================================
// HISTORY RENDER
// =========================================================
function renderHistory() {
  historyList.innerHTML = "";

  if (jobs.length === 0) {
    historyList.innerHTML = `<div class="history-item"><div class="history-meta">No jobs yet.</div></div>`;
    sheetTotal.textContent = "$0.00";
    return;
  }

  const selected = jobFilter.value;

  let sessions = [];
  jobs.forEach(job => {
    if (selected !== "all" && job.id !== selected) return;
    (job.history || []).forEach(s => sessions.push({ job, session: s }));
  });

  const total = sessions.reduce((sum, x) => sum + Number(x.session.earnings || 0), 0);
  sheetTotal.textContent = `$${total.toFixed(2)}`;

  if (sessions.length === 0) {
    historyList.innerHTML = `<div class="history-item"><div class="history-meta">No sessions yet for this job.</div></div>`;
    return;
  }

  sessions.sort((a, b) => new Date(b.session.start) - new Date(a.session.start));

  sessions.forEach(({ job, session }) => {
    const tag = (session.tag && session.tag.trim()) ? session.tag.trim() : "No tag";
    const earnings = `$${Number(session.earnings || 0).toFixed(2)}`;
    const duration = formatTime(Number(session.durationMs || 0));
    const d = dateOnly(session.start);
    const tLine = `${timeOnly(session.start)} - ${timeOnly(session.end)}`;
    const note = (session.note && session.note.trim()) ? session.note.trim() : "";

    const item = document.createElement("div");
    item.className = "history-item";

    item.innerHTML = `
      <div class="history-top">
        <div class="history-left">
          <div class="history-tag">${tag}${selected === "all" ? ` <span class="history-meta">(${job.name})</span>` : ""}</div>
          <div class="history-meta">Duration: ${duration}</div>
          <div class="history-meta">${d}</div>
          <div class="history-meta">${tLine}</div>
          ${note ? `<div class="history-note">${note}</div>` : ""}
        </div>

        <div class="history-right">
          <div class="history-earnings">${earnings}</div>
          <button class="history-edit" data-edit="1" data-job="${job.id}" data-id="${session.id}">Edit</button>
          <button class="history-delete" data-del="1" data-job="${job.id}" data-id="${session.id}">Delete</button>
        </div>
      </div>
    `;

    historyList.appendChild(item);
  });
}

// =========================================================
// SAVE SESSION
// =========================================================
function openSaveSessionModal() {
  tagInput.value = "";
  noteInput.value = "";
  saveSessionModal.classList.remove("hidden");
  setTimeout(() => tagInput.focus(), 50);
}
function closeSaveSessionModal() {
  saveSessionModal.classList.add("hidden");
}
function commitSession(tagText, noteText) {
  const job = getJob(activeJobId);
  if (!job) return;

  const endISO = new Date().toISOString();
  const rate = parseFloat(rateInput.value) || 0;
  const earnings = calcEarnings(rate, accumulated);

  const session = {
    id: uid(),
    tag: (tagText || "").trim(),
    note: (noteText || "").trim(),
    start: pendingSessionStartISO,
    end: endISO,
    durationMs: accumulated,
    rate,
    earnings
  };

  job.history = job.history || [];
  job.history.unshift(session);

  saveJobs();
  closeSaveSessionModal();
  resetTimerUI();
}

// =========================================================
// EDIT / DELETE
// =========================================================
function openDeleteConfirm(jobId, sessionId) {
  deleteTarget = { jobId, sessionId };
  deleteModal.classList.remove("hidden");
}
function closeDeleteConfirm() {
  deleteTarget = null;
  deleteModal.classList.add("hidden");
}
function deleteSession(jobId, sessionId) {
  const job = getJob(jobId);
  if (!job || !job.history) return;
  job.history = job.history.filter(s => s.id !== sessionId);
  saveJobs();
}
function openEditModal(jobId, sessionId) {
  const job = getJob(jobId);
  if (!job) return;

  const s = (job.history || []).find(x => x.id === sessionId);
  if (!s) return;

  editTarget = { jobId, sessionId };

  editTag.value = s.tag || "";
  editNote.value = s.note || "";
  editRate.value = (s.rate ?? "").toString();

  const start = new Date(s.start);
  const end = new Date(s.end);

  editDate.value = start.toISOString().slice(0, 10);
  editStart.value = start.toISOString().slice(11, 16);
  editEnd.value = end.toISOString().slice(11, 16);

  editModal.classList.remove("hidden");
}
function closeEditModal() {
  editTarget = null;
  editModal.classList.add("hidden");
}
function saveEdit() {
  if (!editTarget) return;

  const job = getJob(editTarget.jobId);
  if (!job) return;

  const s = (job.history || []).find(x => x.id === editTarget.sessionId);
  if (!s) return;

  const date = editDate.value;
  const st = editStart.value;
  const en = editEnd.value;

  const start = new Date(`${date}T${st}`);
  const end = new Date(`${date}T${en}`);

  if (!(end > start)) {
    closeEditModal();
    return;
  }

  const rate = parseFloat(editRate.value) || 0;
  const durationMs = end - start;

  s.tag = (editTag.value || "").trim();
  s.note = (editNote.value || "").trim();
  s.start = start.toISOString();
  s.end = end.toISOString();
  s.rate = rate;
  s.durationMs = durationMs;
  s.earnings = calcEarnings(rate, durationMs);

  saveJobs();
  closeEditModal();
}

// =========================================================
// TIMER LOOP
// =========================================================
setInterval(() => {
  if (!running) return;

  const elapsed = accumulated + (Date.now() - startTime);
  timerEl.textContent = formatTime(elapsed);

  const rate = parseFloat(rateInput.value) || 0;
  earningsEl.textContent = `$${calcEarnings(rate, elapsed).toFixed(2)}`;
}, 10);

// =========================================================
// SHEET GESTURES (unchanged)
// =========================================================
function startDrag(y) {
  drag.active = true;
  drag.mode = null;
  drag.startY = y;
  drag.startT = Date.now();
  drag.startH = parseFloat(getComputedStyle(historySheet).getPropertyValue("--sheetH")) || SHEET_MIN;
}

function shouldSheetTakeOver(dy, target) {
  if (target.closest("#sheetHeader") && !target.closest("#closeHistory")) return true;
  if (isInteractive(target)) return false;

  const scrollable = isScrollable(historyList);
  if (!scrollable) return true;

  if (dy > 0 && atTop(historyList)) return true;
  if (dy < 0 && atBottom(historyList)) return true;
  return false;
}

function applyDrag(y) {
  const vh = getViewportH();
  const dy = y - drag.startY;
  const deltaVh = (dy / vh) * 100;
  const newH = drag.startH - deltaVh;
  const v = clamp(newH, SHEET_CLOSE, SHEET_MAX);
  historySheet.style.setProperty("--sheetH", v.toFixed(2));
  historySheet.style.transition = "transform 220ms ease, height 0ms linear";
}

function endDrag(y) {
  if (!drag.active) return;

  const endT = Date.now();
  const dt = Math.max(1, endT - drag.startT);
  const dy = y - drag.startY;
  const vy = dy / dt;
  const speed = Math.abs(vy);

  const currentH = parseFloat(getComputedStyle(historySheet).getPropertyValue("--sheetH")) || SHEET_MIN;

  restoreSheetTransition();

  if (currentH <= SHEET_CLOSE + 1) {
    closeHistorySheet();
    drag.active = false;
    drag.mode = null;
    return;
  }

  const quick = speed > 0.6 && Math.abs(dy) > 45;

  if (quick) {
    if (dy < 0) {
      historySheet.style.setProperty("--sheetH", SHEET_MAX);
    } else {
      if (currentH > SHEET_MIN + 6) {
        historySheet.style.setProperty("--sheetH", SHEET_MIN);
      } else {
        closeHistorySheet();
      }
    }
    drag.active = false;
    drag.mode = null;
    return;
  }

  historySheet.style.setProperty("--sheetH", clamp(currentH, SHEET_CLOSE, SHEET_MAX).toFixed(2));
  drag.active = false;
  drag.mode = null;
}

historySheet.addEventListener("touchstart", (e) => {
  if (historySheet.classList.contains("hidden")) return;
  const t = e.touches[0];
  startDrag(t.clientY);
}, { passive: true });

historySheet.addEventListener("touchmove", (e) => {
  if (!drag.active) return;
  const t = e.touches[0];
  const y = t.clientY;
  const dy = y - drag.startY;

  if (!drag.mode) {
    if (Math.abs(dy) < 6) return;
    drag.mode = shouldSheetTakeOver(dy, e.target) ? "drag" : "scroll";
  }

  if (drag.mode === "drag") {
    e.preventDefault();
    applyDrag(y);
  }
}, { passive: false });

historySheet.addEventListener("touchend", (e) => {
  if (!drag.active) return;
  const t = e.changedTouches[0];
  endDrag(t.clientY);
}, { passive: true });

historySheet.addEventListener("touchcancel", () => {
  if (!drag.active) return;
  restoreSheetTransition();
  drag.active = false;
  drag.mode = null;
}, { passive: true });

// =========================================================
// EVENTS
// =========================================================
jobBtn.addEventListener("click", () => openJobModal());

saveJobBtn.addEventListener("click", () => {
  const name = jobNameInput.value.trim();
  if (!name) return;

  const job = {
    id: uid(),
    name,
    createdAt: new Date().toISOString(),
    history: []
  };

  jobs.push(job);
  activeJobId = job.id;
  localStorage.setItem(ACTIVE_JOB_KEY, activeJobId);
  saveJobs();

  jobNameEl.textContent = job.name;

  closeJobModal();
  populateJobFilter();
  renderHistory();
  unlockUI();
});

cancelJobBtn.addEventListener("click", () => closeJobModal());

rateInput.value = localStorage.getItem(RATE_KEY) || "";
rateInput.addEventListener("input", () => {
  localStorage.setItem(RATE_KEY, rateInput.value);
});

startBtn.addEventListener("click", () => {
  if (!hasActiveJob()) return;

  if (!running) {
    startTime = Date.now();
    pendingSessionStartISO = new Date(startTime).toISOString();
    running = true;

    startBtn.textContent = "STOP";
    startBtn.classList.remove("start");
    startBtn.classList.add("stop");
    return;
  }

  accumulated += Date.now() - startTime;
  running = false;

  startBtn.textContent = "START";
  startBtn.classList.remove("stop");
  startBtn.classList.add("start");

  if (accumulated > 0) {
    openSaveSessionModal();
  } else {
    resetTimerUI();
  }
});

saveSessionBtn.addEventListener("click", () => {
  commitSession(tagInput.value, noteInput.value);
  renderHistory();
});

discardSessionBtn.addEventListener("click", () => {
  commitSession("", "");
  renderHistory();
});

historyBtn.addEventListener("click", () => {
  populateJobFilter();
  renderHistory();
  openHistorySheet();
});

closeHistory.addEventListener("click", () => closeHistorySheet());

/* Open custom filter modal */
jobFilterBtn.addEventListener("click", () => {
  openJobFilterModal();
});

closeJobFilter.addEventListener("click", () => {
  closeJobFilterModal();
});

jobFilterModal.addEventListener("click", (e) => {
  if (!e.target.closest(".filter-card")) closeJobFilterModal();
});

jobFilterList.addEventListener("click", (e) => {
  const row = e.target.closest(".filter-item");
  if (!row) return;

  const value = row.dataset.value || "all";
  jobFilter.value = value;

  setJobFilterLabel();
  closeJobFilterModal();
  renderHistory();
});

historyList.addEventListener("click", (e) => {
  const editBtn = e.target.closest("[data-edit]");
  const delBtn = e.target.closest("[data-del]");

  if (editBtn) {
    openEditModal(editBtn.dataset.job, editBtn.dataset.id);
    return;
  }

  if (delBtn) {
    openDeleteConfirm(delBtn.dataset.job, delBtn.dataset.id);
    return;
  }
});

cancelDeleteBtn.addEventListener("click", () => closeDeleteConfirm());

confirmDeleteBtn.addEventListener("click", () => {
  if (!deleteTarget) return;
  deleteSession(deleteTarget.jobId, deleteTarget.sessionId);
  closeDeleteConfirm();
  renderHistory();
});

cancelEditBtn.addEventListener("click", () => closeEditModal());

saveEditBtn.addEventListener("click", () => {
  saveEdit();
  renderHistory();
});

// =========================================================
// INIT
// =========================================================
ensureActiveJobValid();

if (!hasActiveJob()) {
  lockUI();
  jobNameEl.textContent = "Create Job";
} else {
  jobNameEl.textContent = getJob(activeJobId).name;
  unlockUI();
}

populateJobFilter();
renderHistory();

window.addEventListener("resize", () => {
  if (!historySheet.classList.contains("hidden")) {
    const h = parseFloat(getComputedStyle(historySheet).getPropertyValue("--sheetH")) || SHEET_MIN;
    historySheet.style.setProperty("--sheetH", clamp(h, SHEET_CLOSE, SHEET_MAX).toFixed(2));
    restoreSheetTransition();
  }
});
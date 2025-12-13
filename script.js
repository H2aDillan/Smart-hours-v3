let interval, running = false;
let startTime, accumulated = 0, session;
let deleteIndex = null, editIndex = null;

const timerEl = document.getElementById("timer");
const earningsEl = document.getElementById("earnings");
const rateInput = document.getElementById("rateInput");
const btn = document.getElementById("btn");

const modalOverlay = document.getElementById("modalOverlay");
const tagInput = document.getElementById("tagInput");
const saveTag = document.getElementById("saveTag");
const discardTag = document.getElementById("discardTag");

const historyBtn = document.getElementById("historyBtn");
const historySheet = document.getElementById("historySheet");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");

const deleteModal = document.getElementById("deleteModal");
const confirmDelete = document.getElementById("confirmDelete");
const cancelDelete = document.getElementById("cancelDelete");

const editModal = document.getElementById("editModal");
const editTag = document.getElementById("editTag");
const editDate = document.getElementById("editDate");
const editStart = document.getElementById("editStart");
const editEnd = document.getElementById("editEnd");
const editRate = document.getElementById("editRate");
const saveEdit = document.getElementById("saveEdit");
const cancelEdit = document.getElementById("cancelEdit");

rateInput.value = localStorage.getItem("rate") || "";

function format(ms) {
  const s = ms / 1000;
  return `${String(s/3600|0).padStart(2,0)}:${String(s/60%60|0).padStart(2,0)}:${String(s%60|0).padStart(2,0)}.${String(ms%1000/10|0).padStart(2,0)}`;
}

function earnings(rate, ms) {
  return rate / 3600000 * ms;
}

function getHistory() {
  return JSON.parse(localStorage.getItem("history") || "[]");
}
function setHistory(h) {
  localStorage.setItem("history", JSON.stringify(h));
}

interval = setInterval(() => {
  if (!running) return;
  const ms = accumulated + Date.now() - startTime;
  timerEl.textContent = format(ms);
  earningsEl.textContent = `$${earnings(rateInput.value || 0, ms).toFixed(2)}`;
}, 10);

btn.onclick = () => {
  if (!running) {
    startTime = Date.now();
    running = true;
    btn.textContent = "STOP";
    btn.className = "stop";
    return;
  }

  accumulated += Date.now() - startTime;
  running = false;
  btn.textContent = "START";
  btn.className = "start";

  session = {
    start: new Date(startTime).toISOString(),
    end: new Date().toISOString(),
    durationMs: accumulated,
    earnings: earnings(rateInput.value || 0, accumulated),
    tag: ""
  };

  modalOverlay.classList.remove("hidden");
};

saveTag.onclick = () => saveSession(tagInput.value);
discardTag.onclick = () => saveSession("");

function saveSession(tag) {
  session.tag = tag;
  const h = getHistory();
  h.unshift(session);
  setHistory(h);
  reset();
  modalOverlay.classList.add("hidden");
}

function reset() {
  accumulated = 0;
  timerEl.textContent = "00:00:00.00";
  earningsEl.textContent = "$0.00";
}

historyBtn.onclick = () => {
  historySheet.classList.remove("hidden");
  renderHistory();
};

closeHistory.onclick = () => historySheet.classList.add("hidden");

function renderHistory() {
  historyList.innerHTML = "";
  getHistory().forEach((s,i)=>{
    const st = new Date(s.start), en = new Date(s.end);
    historyList.innerHTML += `
      <div class="history-item">
        <div class="history-top">
          <div>
            <div class="history-tag">${s.tag||"No tag"}</div>
            <div class="history-meta">Duration: ${format(s.durationMs)}</div>
            <div class="history-meta">${st.toLocaleDateString()}</div>
            <div class="history-meta">${st.toLocaleTimeString()} - ${en.toLocaleTimeString()}</div>
          </div>
          <div class="history-right">
            <div class="history-earnings">$${s.earnings.toFixed(2)}</div>
            <button class="history-edit" onclick="openEdit(${i})">Edit</button>
            <button class="history-delete" onclick="openDelete(${i})">Delete</button>
          </div>
        </div>
      </div>`;
  });
}

window.openDelete = i => {
  deleteIndex = i;
  deleteModal.classList.remove("hidden");
};

confirmDelete.onclick = () => {
  const h = getHistory();
  h.splice(deleteIndex,1);
  setHistory(h);
  deleteModal.classList.add("hidden");
  renderHistory();
};
cancelDelete.onclick = () => deleteModal.classList.add("hidden");

window.openEdit = i => {
  editIndex = i;
  const h = getHistory()[i];
  const st = new Date(h.start), en = new Date(h.end);

  editTag.value = h.tag;
  editDate.value = st.toISOString().slice(0,10);
  editStart.value = st.toTimeString().slice(0,8);
  editEnd.value = en.toTimeString().slice(0,8);
  editRate.value = (h.earnings / (h.durationMs/3600000)).toFixed(2);

  editModal.classList.remove("hidden");
};

saveEdit.onclick = () => {
  const h = getHistory();
  const s = h[editIndex];

  const st = new Date(`${editDate.value}T${editStart.value}`);
  const en = new Date(`${editDate.value}T${editEnd.value}`);

  s.tag = editTag.value;
  s.start = st.toISOString();
  s.end = en.toISOString();
  s.durationMs = en - st;
  s.earnings = earnings(editRate.value || 0, s.durationMs);

  setHistory(h);
  editModal.classList.add("hidden");
  renderHistory();
};

cancelEdit.onclick = () => editModal.classList.add("hidden");
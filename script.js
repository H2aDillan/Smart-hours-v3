const actionBtn = document.getElementById('actionBtn');
const timerDisplay = document.getElementById('timer');
const earningsDisplay = document.getElementById('earnings');
const rateInput = document.getElementById('hourlyRate');
const dashboard = document.getElementById('dashboard');
const historyList = document.getElementById('historyList');

// Menu Elements
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');

let startTime;
let timerInterval;
let isRunning = false;

// 1. Fixed Timer Logic
actionBtn.addEventListener('click', () => {
    if (!isRunning) {
        startSession();
    } else {
        stopSession();
    }
});

function startSession() {
    isRunning = true;
    startTime = Date.now();
    
    actionBtn.textContent = 'STOP';
    actionBtn.className = 'btn-stop';
    
    // Reveal UI
    timerDisplay.classList.add('visible');
    earningsDisplay.classList.add('visible');

    timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const rate = parseFloat(rateInput.value) || 0;
        const earnings = (rate / 3600000) * elapsed;

        timerDisplay.textContent = formatTime(elapsed);
        earningsDisplay.textContent = `$${earnings.toFixed(2)}`;
    }, 50);
}

function stopSession() {
    isRunning = false;
    clearInterval(timerInterval);
    addHistory(earningsDisplay.textContent, timerDisplay.textContent);
    
    actionBtn.textContent = 'START';
    actionBtn.className = 'btn-start';
}

// 2. Menu Functionality
menuBtn.addEventListener('click', () => {
    sideMenu.classList.add('open');
    overlay.classList.add('active');
});

overlay.addEventListener('click', () => {
    sideMenu.classList.remove('open');
    overlay.classList.remove('active');
});

// 3. Helper Functions
function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

function addHistory(amount, duration) {
    if (historyList.querySelector('.empty-msg')) historyList.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'history-item';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `<div><div style="font-size:0.9rem;">${duration}</div><div class="history-time">Today, ${now}</div></div><div class="history-amount">${amount}</div>`;
    historyList.prepend(div);
}

// Dashboard toggle
dashboard.querySelector('.dashboard-handle').addEventListener('click', () => {
    dashboard.classList.toggle('expanded');
});

/**
 * Shnack-Pact - Client Side Application Logic
 */

// --- Constants & Config ---
const STORAGE_KEYS = {
    TASKS: 'syncpact_tasks',
    SETTINGS: 'syncpact_settings',
    LAST_DATE: 'syncpact_last_date',
    STREAK: 'syncpact_streak',
    ROADMAP: 'syncpact_roadmap',
    STICKY: 'syncpact_sticky'
};

// --- Application State ---
let state = {
    tasks: [],
    roadmap: [], // { id, title, description, entryType, month, createdAt }
    selectedMonth: new Date().getMonth(), // 0-11 (Jan-Dec)
    currentTab: 'daily', // 'daily' | 'weekly' | 'yearly' | 'backlog' | 'history'
    stickyNote: { text: "Keep up the great work! We got this!", author: "Partner" },
    settings: {
        username: 'Me',
        partnerName: 'Partner',
        roomId: '',
        firebaseConfig: null
    },
    isSyncMode: false,
    partnerTasks: [],
    partnerProgress: 0,
    comments: []
};

// Firebase References
let db = null;
let unsubscribeTasks = null;
let unsubscribePartnerTasks = null;
let unsubscribePartnerMeta = null;
let unsubscribeComments = null;
let unsubscribeRoadmap = null;
let unsubscribeSticky = null;

// --- DOM Elements ---
const dom = {
    currentDateStr: document.getElementById('current-date-str'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    taskForm: document.getElementById('task-form'),
    taskInput: document.getElementById('task-input'),
    taskDescInput: document.getElementById('task-desc-input'),
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    myProgressSection: document.getElementById('my-progress-section'),
    myProgressBar: document.getElementById('my-progress-bar'),
    myProgressText: document.getElementById('my-progress-text'),
    streakCount: document.getElementById('streak-count'),
    
    // Monthly Roadmap selectors
    monthButtons: document.querySelectorAll('.month-btn'),
    roadmapForm: document.getElementById('roadmap-form'),
    roadmapTitleInput: document.getElementById('roadmap-title-input'),
    roadmapTypeSelect: document.getElementById('roadmap-type-select'),
    roadmapDescInput: document.getElementById('roadmap-desc-input'),
    roadmapList: document.getElementById('roadmap-list'),
    roadmapEmptyState: document.getElementById('roadmap-empty-state'),
    
    // Partner section
    partnerSection: document.getElementById('partner-section'),
    partnerUnconfigured: document.getElementById('partner-unconfigured'),
    partnerConfigured: document.getElementById('partner-configured'),
    partnerNameDisplay: document.getElementById('partner-name-display'),
    partnerStatus: document.getElementById('partner-status'),
    partnerAvatar: document.getElementById('partner-avatar'),
    partnerProgressBar: document.getElementById('partner-progress-bar'),
    partnerProgressText: document.getElementById('partner-progress-text'),
    partnerTaskList: document.getElementById('partner-task-list'),
    partnerTaskForm: document.getElementById('partner-task-form'),
    partnerTaskInput: document.getElementById('partner-task-input'),
    
    // Sticky Note Pinned Encouragement
    editStickyBtn: document.getElementById('edit-sticky-btn'),
    stickyNoteText: document.getElementById('sticky-note-text'),
    stickyNoteAuthor: document.getElementById('sticky-note-author'),
    stickyNoteForm: document.getElementById('sticky-note-form'),
    stickyNoteInput: document.getElementById('sticky-note-input'),
    
    // Comments
    commentsList: document.getElementById('comments-list'),
    commentForm: document.getElementById('comment-form'),
    commentInput: document.getElementById('comment-input'),
    
    // Settings
    settingsBtn: document.getElementById('settings-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    setupSyncBtn: document.getElementById('setup-sync-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    settingsForm: document.getElementById('settings-form'),
    clearConfigBtn: document.getElementById('clear-config-btn'),
    syncIndicator: document.getElementById('sync-indicator'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Auth Overlay Elements
    authOverlay: document.getElementById('auth-overlay'),
    authTabLogin: document.getElementById('auth-tab-login'),
    authTabSignup: document.getElementById('auth-tab-signup'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    signupForm: document.getElementById('signup-form'),
    signupName: document.getElementById('signup-name'),
    signupEmail: document.getElementById('signup-email'),
    signupPassword: document.getElementById('signup-password'),
    bypassAuthBtn: document.getElementById('bypass-auth-btn'),
    
    // Settings Inputs
    usernameInput: document.getElementById('username-input'),
    partnernameInput: document.getElementById('partnername-input'),
    roomIdInput: document.getElementById('room-id-input'),
    fbApiKey: document.getElementById('fb-apikey'),
    fbAuthDomain: document.getElementById('fb-authdomain'),
    fbProjectId: document.getElementById('fb-projectid'),
    fbAppId: document.getElementById('fb-appid')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initDateDisplay();
    loadSettings();
    initTheme();
    initStreak();
    initApp();
    setupEventListeners();
});

// Display Current Date
function initDateDisplay() {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    dom.currentDateStr.textContent = new Date().toLocaleDateString('en-US', options);
}

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('syncpact_theme');
    const icon = dom.themeToggleBtn.querySelector('i');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        icon.className = 'fa-solid fa-sun';
    } else {
        document.body.classList.remove('light-theme');
        icon.className = 'fa-solid fa-moon';
    }
}

// Load settings from LocalStorage
function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
        state.settings = JSON.parse(saved);
        
        // Populate settings form fields
        dom.usernameInput.value = state.settings.username || '';
        dom.partnernameInput.value = state.settings.partnerName || '';
        dom.roomIdInput.value = state.settings.roomId || '';
        
        if (state.settings.firebaseConfig) {
            dom.fbApiKey.value = state.settings.firebaseConfig.apiKey || '';
            dom.fbAuthDomain.value = state.settings.firebaseConfig.authDomain || '';
            dom.fbProjectId.value = state.settings.firebaseConfig.projectId || '';
            dom.fbAppId.value = state.settings.firebaseConfig.appId || '';
            
            state.isSyncMode = true;
        } else {
            state.isSyncMode = false;
        }
    }
}

// Save settings to LocalStorage
function saveSettings(newSettings) {
    state.settings = newSettings;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    state.isSyncMode = !!newSettings.firebaseConfig;
}

// Initialize Streak Counter
function initStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let streak = { count: 0, lastVisit: '' };
    const savedStreak = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (savedStreak) {
        streak = JSON.parse(savedStreak);
    }
    
    if (streak.lastVisit === todayStr) {
        // Already visited today
    } else if (streak.lastVisit === yesterdayStr) {
        // Visited yesterday, increment streak
        streak.count += 1;
        streak.lastVisit = todayStr;
    } else {
        // Reset streak
        streak.count = 1;
        streak.lastVisit = todayStr;
    }
    
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
    dom.streakCount.textContent = streak.count;
}

// Initialize Application State & Storage Mode
function initApp() {
    // Initial active Month Highlight
    updateMonthSelectionUI();

    if (state.isSyncMode) {
        initFirebase();
    } else {
        initLocalMode();
    }
}

// --- Local Storage Mode ---
function initLocalMode() {
    console.log("Initializing in Local Mode...");
    db = null;
    
    // Set UI indicators
    dom.syncIndicator.className = "sync-indicator local";
    dom.syncIndicator.querySelector('.indicator-text').textContent = "Local Mode";
    dom.partnerUnconfigured.classList.add('hidden'); // Hide unconfigured panel
    dom.partnerConfigured.classList.remove('hidden'); // Show configured panel
    
    // Set mock settings names
    dom.partnerNameDisplay.textContent = `${state.settings.partnerName || 'Partner'}'s Goals`;
    dom.partnerAvatar.textContent = (state.settings.partnerName || 'P').charAt(0).toUpperCase();
    dom.partnerStatus.textContent = "Offline (Local Preview)";
    dom.partnerStatus.style.color = "var(--text-muted)";
    
    // Load local tasks
    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    state.tasks = savedTasks ? JSON.parse(savedTasks) : [];
    
    // Load local roadmap
    const savedRoadmap = localStorage.getItem(STORAGE_KEYS.ROADMAP);
    state.roadmap = savedRoadmap ? JSON.parse(savedRoadmap) : [];
    
    // Load local sticky note
    const savedSticky = localStorage.getItem(STORAGE_KEYS.STICKY);
    state.stickyNote = savedSticky ? JSON.parse(savedSticky) : { text: "Keep up the great work! We got this!", author: "System" };
    renderStickyNote();
    
    // Load local simulated partner tasks
    const savedPartnerTasks = localStorage.getItem('syncpact_partner_tasks');
    state.partnerTasks = savedPartnerTasks ? JSON.parse(savedPartnerTasks) : [];
    
    // Run daily rollover check
    checkAndRolloverTasks();
    
    // Render lists
    renderTasks();
    renderPartnerTasks();
    renderRoadmap();
}

// --- Daily Rollover Logic ---
function checkAndRolloverTasks() {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);
    
    if (lastDate && lastDate !== todayStr) {
        console.log(`Date changed from ${lastDate} to ${todayStr}. Running task rollover...`);
        let rolloverCount = 0;
        
        state.tasks = state.tasks.map(task => {
            if (task.type === 'daily' && !task.completed) {
                task.dateCreated = todayStr;
                task.rolledOver = (task.rolledOver || 0) + 1;
                rolloverCount++;
            }
            return task;
        });
        
        if (rolloverCount > 0) {
            console.log(`Rolled over ${rolloverCount} incomplete tasks to today.`);
            saveTasks();
        }
    }
    
    localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
}

// Save tasks to destination (local or remote)
function saveTasks() {
    if (state.isSyncMode && db) {
        updateMyCloudProgress();
    } else {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
        calculateProgress();
    }
}

// Save roadmap items
function saveRoadmap() {
    if (state.isSyncMode && db) {
        // Sync handles saving to Cloud directly in functions
    } else {
        localStorage.setItem(STORAGE_KEYS.ROADMAP, JSON.stringify(state.roadmap));
        renderRoadmap();
    }
}

// --- Firebase Sync Mode ---
let isAuthListenerAttached = false;

function initFirebase() {
    console.log("Connecting to Firebase...");
    dom.syncIndicator.className = "sync-indicator connecting";
    dom.syncIndicator.querySelector('.indicator-text').textContent = "Connecting...";
    
    // Clean up previous listeners
    if (unsubscribeTasks) unsubscribeTasks();
    if (unsubscribePartnerTasks) unsubscribePartnerTasks();
    if (unsubscribePartnerMeta) unsubscribePartnerMeta();
    if (unsubscribeComments) unsubscribeComments();
    if (unsubscribeRoadmap) unsubscribeRoadmap();
    if (unsubscribeSticky) unsubscribeSticky();

    try {
        if (firebase.apps.length === 0) {
            firebase.initializeApp(state.settings.firebaseConfig);
        }
        
        if (!isAuthListenerAttached) {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    console.log("User authenticated:", user.email);
                    dom.authOverlay.classList.add('hidden');
                    dom.logoutBtn.classList.remove('hidden');
                    
                    if (user.displayName && state.settings.username === 'Me') {
                        state.settings.username = user.displayName;
                        dom.usernameInput.value = user.displayName;
                        saveSettings(state.settings);
                    }
                    
                    connectFirestore();
                } else {
                    console.log("User not logged in");
                    dom.authOverlay.classList.remove('hidden');
                    dom.logoutBtn.classList.add('hidden');
                    dom.syncIndicator.className = "sync-indicator local";
                    dom.syncIndicator.querySelector('.indicator-text').textContent = "Auth Required";
                }
            });
            isAuthListenerAttached = true;
        } else {
            const user = firebase.auth().currentUser;
            if (user) {
                dom.authOverlay.classList.add('hidden');
                dom.logoutBtn.classList.remove('hidden');
                connectFirestore();
            } else {
                dom.authOverlay.classList.remove('hidden');
                dom.logoutBtn.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error("Firebase init failed:", e);
        handleSyncError();
    }
}

function connectFirestore() {
    db = firebase.firestore();
    
    // Show Sync Dashboard Layout
    dom.partnerUnconfigured.classList.add('hidden');
    dom.partnerConfigured.classList.remove('hidden');
    dom.partnerNameDisplay.textContent = `${state.settings.partnerName || 'Partner'}'s Goals`;
    dom.partnerAvatar.textContent = (state.settings.partnerName || 'P').charAt(0).toUpperCase();
    
    // 1. Listen for My Tasks in real-time
    const myTasksRef = db.collection('rooms').doc(state.settings.roomId)
                         .collection('users').doc(state.settings.username)
                         .collection('tasks');
                         
    unsubscribeTasks = myTasksRef.orderBy('createdAt', 'asc').onSnapshot(snapshot => {
        state.tasks = [];
        snapshot.forEach(doc => {
            state.tasks.push({ id: doc.id, ...doc.data() });
        });
        
        checkAndRolloverCloudTasks();
        dom.syncIndicator.className = "sync-indicator synced";
        dom.syncIndicator.querySelector('.indicator-text').textContent = "Synced";
        
        renderTasks();
    }, err => {
        console.error("Firestore Tasks error:", err);
        handleSyncError();
    });
    
    // 2. Listen for Shared Monthly Roadmap in real-time
    const roadmapRef = db.collection('rooms').doc(state.settings.roomId)
                         .collection('roadmap');
                         
    unsubscribeRoadmap = roadmapRef.orderBy('createdAt', 'asc').onSnapshot(snapshot => {
        state.roadmap = [];
        snapshot.forEach(doc => {
            state.roadmap.push({ id: doc.id, ...doc.data() });
        });
        renderRoadmap();
    }, err => {
        console.error("Firestore Roadmap error:", err);
    });
    
    // 3. Listen for Partner's Tasks
    if (state.settings.partnerName) {
        const partnerTasksRef = db.collection('rooms').doc(state.settings.roomId)
                                 .collection('users').doc(state.settings.partnerName)
                                 .collection('tasks');
                                 
        unsubscribePartnerTasks = partnerTasksRef.orderBy('createdAt', 'asc').onSnapshot(snapshot => {
            state.partnerTasks = [];
            snapshot.forEach(doc => {
                state.partnerTasks.push({ id: doc.id, ...doc.data() });
            });
            renderPartnerTasks();
        }, err => {
            console.error("Firestore Partner Tasks error:", err);
        });
        
        // 4. Listen for Partner's Metadata
        const partnerMetaRef = db.collection('rooms').doc(state.settings.roomId)
                                 .collection('users').doc(state.settings.partnerName);
                                 
        unsubscribePartnerMeta = partnerMetaRef.onSnapshot(doc => {
            if (doc.exists && doc.data()) {
                const data = doc.data();
                state.partnerProgress = data.progress || 0;
                dom.partnerStatus.textContent = "Connected";
                dom.partnerStatus.style.color = "var(--secondary)";
                updatePartnerProgressBar();
            } else {
                dom.partnerStatus.textContent = "Offline / Not Joined";
                dom.partnerStatus.style.color = "var(--text-muted)";
            }
        });
    }
    
    // 5. Listen for Comments
    const commentsRef = db.collection('rooms').doc(state.settings.roomId)
                          .collection('comments');
                          
    unsubscribeComments = commentsRef.orderBy('timestamp', 'asc').limitToLast(50).onSnapshot(snapshot => {
        state.comments = [];
        snapshot.forEach(doc => {
            state.comments.push({ id: doc.id, ...doc.data() });
        });
        renderComments();
    });

    // 6. Listen for Pinned Sticky Note
    const stickyRef = db.collection('rooms').doc(state.settings.roomId)
                        .collection('stickyNote').doc('latest');
                        
    unsubscribeSticky = stickyRef.onSnapshot(doc => {
        if (doc.exists && doc.data()) {
            state.stickyNote = doc.data();
            renderStickyNote();
        } else {
            state.stickyNote = { text: "Keep up the great work! We got this!", author: "Partner" };
            renderStickyNote();
        }
    });

    updateMyCloudProgress();
}

function handleSyncError() {
    dom.syncIndicator.className = "sync-indicator local";
    dom.syncIndicator.querySelector('.indicator-text').textContent = "Sync Error";
    alert("Could not connect to database. Please check your Firebase config / auth status / rules.");
}

// Daily Rollover for Firebase synced tasks
function checkAndRolloverCloudTasks() {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);
    
    if (lastDate && lastDate !== todayStr && db) {
        console.log("Cloud rollover check triggered.");
        let batch = db.batch();
        let changed = false;
        
        state.tasks.forEach(task => {
            if (task.type === 'daily' && !task.completed && task.dateCreated !== todayStr) {
                const docRef = db.collection('rooms').doc(state.settings.roomId)
                                 .collection('users').doc(state.settings.username)
                                 .collection('tasks').doc(task.id);
                batch.update(docRef, {
                    dateCreated: todayStr,
                    rolledOver: (task.rolledOver || 0) + 1
                });
                changed = true;
            }
        });
        
        if (changed) {
            batch.commit().then(() => console.log("Cloud tasks rolled over to today."));
        }
        localStorage.setItem(STORAGE_KEYS.LAST_DATE, todayStr);
    }
}

async function updateMyCloudProgress() {
    if (!db) return;
    if (state.currentTab === 'history') return;
    
    const typedTasks = state.tasks.filter(t => t.type === state.currentTab);
    const completed = typedTasks.filter(t => t.completed).length;
    const progress = typedTasks.length > 0 ? (completed / typedTasks.length) * 100 : 0;
    
    await db.collection('rooms').doc(state.settings.roomId)
            .collection('users').doc(state.settings.username)
            .set({
                progress: progress,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
}

// --- Task Functions ---
function addTask(text, desc = '') {
    const todayStr = new Date().toISOString().split('T')[0];
    const newTask = {
        text: text,
        description: desc,
        completed: false,
        type: state.currentTab,
        dateCreated: todayStr,
        createdAt: Date.now(),
        rolledOver: 0,
        dateCompleted: ''
    };
    
    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('users').doc(state.settings.username)
          .collection('tasks').add(newTask);
    } else {
        newTask.id = 'task-' + Date.now();
        state.tasks.push(newTask);
        saveTasks();
        renderTasks();
    }
}

function toggleTaskComplete(id) {
    const todayStr = new Date().toISOString().split('T')[0];
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    
    const nextCompletedVal = !task.completed;
    const dateCompletedVal = nextCompletedVal ? todayStr : '';
    
    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('users').doc(state.settings.username)
          .collection('tasks').doc(id).update({
              completed: nextCompletedVal,
              dateCompleted: dateCompletedVal
          });
    } else {
        state.tasks = state.tasks.map(t => {
            if (t.id === id) {
                t.completed = nextCompletedVal;
                t.dateCompleted = dateCompletedVal;
            }
            return t;
        });
        saveTasks();
        renderTasks();
    }
}

function deleteTask(id) {
    if (confirm("Are you sure you have completed this task?")) {
        if (state.isSyncMode && db) {
            db.collection('rooms').doc(state.settings.roomId)
              .collection('users').doc(state.settings.username)
              .collection('tasks').doc(id).delete();
        } else {
            state.tasks = state.tasks.filter(task => task.id !== id);
            saveTasks();
            renderTasks();
        }
    }
}

// --- Sticky Pinned Note Functions ---
function pinStickyNote(text) {
    const updatedNote = {
        text: text,
        author: state.settings.username,
        timestamp: Date.now()
    };

    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('stickyNote').doc('latest').set(updatedNote);
    } else {
        state.stickyNote = updatedNote;
        localStorage.setItem(STORAGE_KEYS.STICKY, JSON.stringify(updatedNote));
        renderStickyNote();
    }
}

function renderStickyNote() {
    dom.stickyNoteText.textContent = `"${state.stickyNote.text}"`;
    dom.stickyNoteAuthor.textContent = `— Pinned by ${state.stickyNote.author || 'System'}`;
}

// --- Monthly Roadmap Hub Functions ---
function addRoadmapEntry(title, desc = '', type = 'task') {
    const newEntry = {
        title: title,
        description: desc,
        entryType: type,
        month: state.selectedMonth,
        createdAt: Date.now()
    };

    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('roadmap').add(newEntry);
    } else {
        newEntry.id = 'roadmap-' + Date.now();
        state.roadmap.push(newEntry);
        saveRoadmap();
    }
}

function deleteRoadmapEntry(id) {
    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('roadmap').doc(id).delete();
    } else {
        state.roadmap = state.roadmap.filter(e => e.id !== id);
        saveRoadmap();
    }
}

// Update highlighting on months
function updateMonthSelectionUI() {
    dom.monthButtons.forEach(btn => {
        const m = parseInt(btn.getAttribute('data-month'));
        if (m === state.selectedMonth) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- UI Rendering ---

// Draw your current active list
function renderTasks() {
    if (state.currentTab === 'history') {
        renderHistory();
        return;
    }
    
    dom.taskForm.classList.remove('hidden');
    dom.myProgressSection.classList.remove('hidden');
    
    const filtered = state.tasks.filter(t => t.type === state.currentTab);
    dom.taskList.innerHTML = '';
    
    if (filtered.length === 0) {
        dom.emptyState.classList.remove('hidden');
        dom.emptyState.querySelector('p').textContent = `No ${state.currentTab} goals registered. Add one below!`;
    } else {
        dom.emptyState.classList.add('hidden');
        filtered.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const rolloverBadge = task.rolledOver > 0 
                ? `<span class="badge" title="Rolled over ${task.rolledOver} times"><i class="fa-solid fa-arrow-right-long"></i> ${task.rolledOver}</span>` 
                : '';
            
            const descHtml = task.description 
                ? `<div class="task-description">${escapeHtml(task.description)}</div>` 
                : '';
                
            li.innerHTML = `
                <div class="task-item-main">
                    <div class="task-item-left">
                        <div class="custom-checkbox" onclick="toggleTaskComplete('${task.id}')">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <span class="task-text">${escapeHtml(task.text)} ${rolloverBadge}</span>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn delete-btn" onclick="deleteTask('${task.id}')" title="Delete Task">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                ${descHtml}
            `;
            dom.taskList.appendChild(li);
        });
    }
    
    calculateProgress();
}

// Draw history logs (completed tasks organized by completion date)
function renderHistory() {
    dom.taskForm.classList.add('hidden');
    dom.myProgressSection.classList.add('hidden');
    dom.taskList.innerHTML = '';
    
    const completedTasks = state.tasks.filter(t => t.completed);
    
    if (completedTasks.length === 0) {
        dom.emptyState.classList.remove('hidden');
        dom.emptyState.querySelector('p').textContent = "No completed tasks in history yet. Get to work!";
        return;
    }
    
    dom.emptyState.classList.add('hidden');
    
    const groups = {};
    completedTasks.forEach(task => {
        const dateStr = task.dateCompleted || 'Completed (Date Unknown)';
        if (!groups[dateStr]) {
            groups[dateStr] = [];
        }
        groups[dateStr].push(task);
    });
    
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
    
    const historySection = document.createElement('div');
    historySection.className = 'history-section';
    
    sortedDates.forEach(date => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'history-group';
        
        let displayDate = date;
        try {
            if (date !== 'Completed (Date Unknown)') {
                const parsedDate = new Date(date);
                displayDate = parsedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
        } catch (e) {}
        
        groupDiv.innerHTML = `
            <div class="history-group-header">
                <span>${displayDate}</span>
                <span>${groups[date].length} task(s)</span>
            </div>
            <ul class="history-group-list">
                ${groups[date].map(t => `
                    <li class="history-item">
                        <div class="history-item-left">
                            <span class="history-item-check"><i class="fa-solid fa-circle-check"></i></span>
                            <span class="history-item-text">${escapeHtml(t.text)}</span>
                        </div>
                        <span class="history-item-meta">${t.type.toUpperCase()}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        historySection.appendChild(groupDiv);
    });
    
    dom.taskList.appendChild(historySection);
}

// Draw Monthly Roadmap Checklist / Announcements
function renderRoadmap() {
    dom.roadmapList.innerHTML = '';
    const filtered = state.roadmap.filter(e => e.month === state.selectedMonth);

    if (filtered.length === 0) {
        dom.roadmapEmptyState.classList.remove('hidden');
    } else {
        dom.roadmapEmptyState.classList.add('hidden');
        filtered.forEach(entry => {
            const li = document.createElement('li');
            li.className = `roadmap-item ${entry.entryType}`;
            
            const descHtml = entry.description 
                ? `<div class="roadmap-item-desc">${escapeHtml(entry.description)}</div>` 
                : '';

            let typeIcon = 'fa-calendar-check';
            if (entry.entryType === 'reminder') typeIcon = 'fa-bell';
            if (entry.entryType === 'announcement') typeIcon = 'fa-bullhorn';

            li.innerHTML = `
                <div class="roadmap-item-header">
                    <div class="roadmap-item-left">
                        <span style="color: var(--text-secondary);"><i class="fa-solid ${typeIcon}"></i></span>
                        <span class="roadmap-item-title">${escapeHtml(entry.title)}</span>
                        <span class="roadmap-item-badge">${entry.entryType}</span>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn delete-btn" onclick="deleteRoadmapEntry('${entry.id}')" title="Delete Entry">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                ${descHtml}
            `;
            dom.roadmapList.appendChild(li);
        });
    }
}

// Make roadmap deletion global
window.deleteRoadmapEntry = deleteRoadmapEntry;

// Draw partner's active tab tasks
function renderPartnerTasks() {
    if (state.currentTab === 'history') {
        dom.partnerTaskList.innerHTML = `<li class="empty-state-small">History tab selected.</li>`;
        return;
    }
    
    const filtered = state.partnerTasks.filter(t => t.type === state.currentTab);
    dom.partnerTaskList.innerHTML = '';
    
    if (filtered.length === 0) {
        dom.partnerTaskList.innerHTML = `<li class="empty-state-small">No active ${state.currentTab} goals.</li>`;
    } else {
        filtered.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const descHtml = task.description 
                ? `<div class="task-description">${escapeHtml(task.description)}</div>` 
                : '';
                
            li.innerHTML = `
                <div class="task-item-main">
                    <div class="task-item-left">
                        <div class="custom-checkbox" onclick="togglePartnerTaskComplete('${task.id}')">
                            <i class="fa-solid fa-check"></i>
                        </div>
                        <span class="task-text">${escapeHtml(task.text)}</span>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn delete-btn" onclick="deletePartnerTask('${task.id}')" title="Delete Task">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                ${descHtml}
            `;
            dom.partnerTaskList.appendChild(li);
        });
    }
}

// --- Collaborative Mutual Tasks Management Functions ---
function assignPartnerTask(text) {
    const todayStr = new Date().toISOString().split('T')[0];
    const newTask = {
        text: text,
        description: `Assigned by ${state.settings.username}`,
        completed: false,
        type: state.currentTab,
        dateCreated: todayStr,
        createdAt: Date.now(),
        rolledOver: 0,
        dateCompleted: ''
    };

    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('users').doc(state.settings.partnerName)
          .collection('tasks').add(newTask);
    } else {
        newTask.id = 'task-' + Date.now();
        state.partnerTasks.push(newTask);
        localStorage.setItem('syncpact_partner_tasks', JSON.stringify(state.partnerTasks));
        renderPartnerTasks();
    }
}

function togglePartnerTaskComplete(id) {
    const todayStr = new Date().toISOString().split('T')[0];
    const task = state.partnerTasks.find(t => t.id === id);
    if (!task) return;

    const nextCompletedVal = !task.completed;
    const dateCompletedVal = nextCompletedVal ? todayStr : '';

    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('users').doc(state.settings.partnerName)
          .collection('tasks').doc(id).update({
              completed: nextCompletedVal,
              dateCompleted: dateCompletedVal
          });
    } else {
        state.partnerTasks = state.partnerTasks.map(t => {
            if (t.id === id) {
                t.completed = nextCompletedVal;
                t.dateCompleted = dateCompletedVal;
            }
            return t;
        });
        localStorage.setItem('syncpact_partner_tasks', JSON.stringify(state.partnerTasks));
        renderPartnerTasks();
    }
}

function deletePartnerTask(id) {
    if (confirm("Are you sure you want to delete this task from your partner's list?")) {
        if (state.isSyncMode && db) {
            db.collection('rooms').doc(state.settings.roomId)
              .collection('users').doc(state.settings.partnerName)
              .collection('tasks').doc(id).delete();
        } else {
            state.partnerTasks = state.partnerTasks.filter(t => t.id !== id);
            localStorage.setItem('syncpact_partner_tasks', JSON.stringify(state.partnerTasks));
            renderPartnerTasks();
        }
    }
}

// Bind to window for global inline clicks
window.togglePartnerTaskComplete = togglePartnerTaskComplete;
window.deletePartnerTask = deletePartnerTask;

// Calculate Progress Metrics
function calculateProgress() {
    if (state.currentTab === 'history') return;
    
    const filtered = state.tasks.filter(t => t.type === state.currentTab);
    const completed = filtered.filter(t => t.completed).length;
    const pct = filtered.length > 0 ? Math.round((completed / filtered.length) * 100) : 0;
    
    dom.myProgressBar.style.width = `${pct}%`;
    dom.myProgressText.textContent = `${pct}%`;
    
    if (state.isSyncMode && db) {
        db.collection('rooms').doc(state.settings.roomId)
          .collection('users').doc(state.settings.username)
          .update({ progress: pct });
    }
}

// Update partner progress visual
function updatePartnerProgressBar() {
    dom.partnerProgressBar.style.width = `${state.partnerProgress}%`;
    dom.partnerProgressText.textContent = `${Math.round(state.partnerProgress)}%`;
}

// Add comment to Firestore comments board
async function addComment(text) {
    if (!state.isSyncMode || !db) return;
    
    const newComment = {
        text: text,
        sender: state.settings.username,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('rooms').doc(state.settings.roomId)
            .collection('comments').add(newComment);
}

// Render comments list
function renderComments() {
    dom.commentsList.innerHTML = '';
    
    if (state.comments.length === 0) {
        dom.commentsList.innerHTML = '<div class="empty-comments">No messages yet. Say hello or nudge your partner!</div>';
        return;
    }
    
    state.comments.forEach(comment => {
        const isMe = comment.sender === state.settings.username;
        const bubble = document.createElement('div');
        bubble.className = `comment-bubble ${isMe ? 'me' : 'partner'}`;
        
        let timeStr = "";
        if (comment.timestamp) {
            const dateObj = comment.timestamp.toDate();
            timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        bubble.innerHTML = `
            <span class="comment-author">${escapeHtml(comment.sender)}</span>
            <span class="comment-content">${escapeHtml(comment.text)}</span>
            <span class="comment-time">${timeStr}</span>
        `;
        dom.commentsList.appendChild(bubble);
    });
    
    dom.commentsList.scrollTop = dom.commentsList.scrollHeight;
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Personal tab changes
    dom.tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            dom.tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentTab = btn.getAttribute('data-tab');
            
            dom.taskInput.placeholder = `Add a new ${state.currentTab} goal...`;
            
            renderTasks();
            if (state.isSyncMode) {
                renderPartnerTasks();
                updateMyCloudProgress();
            }
        });
    });

    // Month Selector grid clicks
    dom.monthButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.selectedMonth = parseInt(btn.getAttribute('data-month'));
            updateMonthSelectionUI();
            renderRoadmap();
        });
    });
    
    // Submit personal task form
    dom.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = dom.taskInput.value.trim();
        const desc = dom.taskDescInput.value.trim();
        
        if (text) {
            addTask(text, desc);
            dom.taskInput.value = '';
            dom.taskDescInput.value = '';
        }
    });

    // Submit monthly roadmap form
    dom.roadmapForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = dom.roadmapTitleInput.value.trim();
        const type = dom.roadmapTypeSelect.value;
        const desc = dom.roadmapDescInput.value.trim();

        if (title) {
            addRoadmapEntry(title, desc, type);
            dom.roadmapTitleInput.value = '';
            dom.roadmapDescInput.value = '';
        }
    });

    // Submit partner assigned task form
    dom.partnerTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = dom.partnerTaskInput.value.trim();
        if (text) {
            assignPartnerTask(text);
            dom.partnerTaskInput.value = '';
        }
    });

    // Toggle and submit Pinned Sticky Note Encouragements
    dom.editStickyBtn.addEventListener('click', () => {
        const isHidden = dom.stickyNoteForm.classList.toggle('hidden');
        if (!isHidden) {
            dom.stickyNoteInput.value = state.stickyNote.text;
            dom.stickyNoteInput.focus();
        }
    });

    dom.stickyNoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = dom.stickyNoteInput.value.trim();
        if (text) {
            pinStickyNote(text);
            dom.stickyNoteForm.classList.add('hidden');
            dom.stickyNoteInput.value = '';
        }
    });
    
    // Comments form
    dom.commentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = dom.commentInput.value.trim();
        if (text) {
            addComment(text);
            dom.commentInput.value = '';
        }
    });
    
    // Modals trigger
    const openSettings = () => dom.settingsModal.classList.remove('hidden');
    const closeSettings = () => dom.settingsModal.classList.add('hidden');
    
    dom.themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('syncpact_theme', isLight ? 'light' : 'dark');
        const icon = dom.themeToggleBtn.querySelector('i');
        if (isLight) {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    });

    dom.settingsBtn.addEventListener('click', openSettings);
    dom.setupSyncBtn.addEventListener('click', openSettings);
    dom.closeSettingsBtn.addEventListener('click', closeSettings);
    
    // Settings form submit
    dom.settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = dom.usernameInput.value.trim();
        const partnerName = dom.partnernameInput.value.trim();
        const roomId = dom.roomIdInput.value.trim();
        
        let config = null;
        if (dom.fbApiKey.value) {
            config = {
                apiKey: dom.fbApiKey.value.trim(),
                authDomain: dom.fbAuthDomain.value.trim(),
                projectId: dom.fbProjectId.value.trim(),
                appId: dom.fbAppId.value.trim()
            };
        }
        
        saveSettings({
            username,
            partnerName,
            roomId,
            firebaseConfig: config
        });
        
        closeSettings();
        initApp();
    });
    
    // Reset configuration settings to Local Mode
    dom.clearConfigBtn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        state.settings = {
            username: 'Me',
            partnerName: 'Partner',
            roomId: '',
            firebaseConfig: null
        };
        state.isSyncMode = false;
        
        dom.usernameInput.value = '';
        dom.partnernameInput.value = '';
        dom.roomIdInput.value = '';
        dom.fbApiKey.value = '';
        dom.fbAuthDomain.value = '';
        dom.fbProjectId.value = '';
        dom.fbAppId.value = '';
        
        closeSettings();
        
        // Log out of Firebase auth if logged in
        if (firebase.apps.length > 0) {
            firebase.auth().signOut().catch(() => {});
        }
        
        initApp();
    });

    // --- Authentication Event Handlers ---
    
    // Switch between Login and Signup tabs
    dom.authTabLogin.addEventListener('click', () => {
        dom.authTabLogin.classList.add('active');
        dom.authTabSignup.classList.remove('active');
        dom.loginForm.classList.remove('hidden');
        dom.signupForm.classList.add('hidden');
    });

    dom.authTabSignup.addEventListener('click', () => {
        dom.authTabSignup.classList.add('active');
        dom.authTabLogin.classList.remove('active');
        dom.signupForm.classList.remove('hidden');
        dom.loginForm.classList.add('hidden');
    });

    // Submit Log In form
    dom.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = dom.loginEmail.value.trim();
        const password = dom.loginPassword.value.trim();
        
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                dom.loginEmail.value = '';
                dom.loginPassword.value = '';
            })
            .catch(err => {
                console.error(err);
                alert("Login Failed: " + err.message);
            });
    });

    // Submit Sign Up form
    dom.signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = dom.signupName.value.trim();
        const email = dom.signupEmail.value.trim();
        const password = dom.signupPassword.value.trim();
        
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((cred) => {
                // Update Firebase User Profile Display Name
                return cred.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                // Sync settings username with registered name
                state.settings.username = name;
                dom.usernameInput.value = name;
                saveSettings(state.settings);
                
                dom.signupName.value = '';
                dom.signupEmail.value = '';
                dom.signupPassword.value = '';
            })
            .catch(err => {
                console.error(err);
                alert("Signup Failed: " + err.message);
            });
    });

    // Click Log Out
    dom.logoutBtn.addEventListener('click', () => {
        firebase.auth().signOut().catch(err => alert("Sign out failed: " + err.message));
    });

    // Click Bypass to Local Mode
    dom.bypassAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        state.isSyncMode = false;
        
        // Temporarily clear configuration keys so it boots locally
        dom.authOverlay.classList.add('hidden');
        initLocalMode();
    });
}

// Utility function to escape HTML prevents XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

/**
 * TODO App - Main Application Logic
 * Production-ready PWA with Firebase Auth + Firestore
 */

// Firebase SDK v9+ (modular imports)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Import Firebase config
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * STATE MANAGEMENT
 */
const state = {
  user: null,
  tasks: [],
  currentView: 'kanban',
  selectedTask: null,
  unsubscribe: null,
  isOnline: navigator.onLine,
  undoStack: [],
  theme: localStorage.getItem('theme') || 'dark'
};

/**
 * DOM ELEMENTS
 */
const elements = {
  authModal: document.getElementById('auth-modal'),
  authForm: document.getElementById('auth-form'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  authError: document.getElementById('auth-error'),
  loginBtn: document.getElementById('login-btn'),
  signupBtn: document.getElementById('signup-btn'),
  logoutBtn: document.getElementById('logout-btn'),
  app: document.getElementById('app'),
  offlineBanner: document.getElementById('offline-banner'),
  quickInput: document.getElementById('quick-input'),
  quickAddBtn: document.getElementById('quick-add-btn'),
  kanbanView: document.getElementById('kanban-view'),
  listView: document.getElementById('list-view'),
  calendarView: document.getElementById('calendar-view'),
  taskModal: document.getElementById('task-modal'),
  commandPalette: document.getElementById('command-palette'),
  toastContainer: document.getElementById('toast-container'),
  themeToggle: document.getElementById('theme-toggle')
};

/**
 * AUTHENTICATION
 */

// Show/Hide Auth Modal
function showAuthModal() {
  elements.authModal.hidden = false;
  elements.authEmail.focus();
}

function hideAuthModal() {
  elements.authModal.hidden = true;
  elements.authError.hidden = true;
  elements.authForm.reset();
}

// Handle Login
async function handleLogin(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    hideAuthModal();
  } catch (error) {
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Handle Signup
async function handleSignup(email, password) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    hideAuthModal();
    showToast('Account created successfully!', 'success');
  } catch (error) {
    showAuthError(getAuthErrorMessage(error.code));
  }
}

// Handle Logout
async function handleLogout() {
  try {
    if (state.unsubscribe) {
      state.unsubscribe();
      state.unsubscribe = null;
    }
    await signOut(auth);
    state.tasks = [];
    state.user = null;
    elements.app.hidden = true;
    showAuthModal();
    showToast('Signed out successfully', 'info');
  } catch (error) {
    showToast('Error signing out: ' + error.message, 'error');
  }
}

// Show Auth Error
function showAuthError(message) {
  elements.authError.textContent = message;
  elements.authError.hidden = false;
}

// Get friendly error message
function getAuthErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
  };
  return messages[code] || 'An error occurred. Please try again.';
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    state.user = user;
    elements.app.hidden = false;
    hideAuthModal();
    startApp();
  } else {
    state.user = null;
    elements.app.hidden = true;
    showAuthModal();
  }
});

/**
 * FIRESTORE DATA LAYER
 */

// Initialize app after auth
function startApp() {
  loadTasks();
  renderCurrentView();
  initializeSortable();
}

// Load tasks with realtime sync
function loadTasks() {
  if (state.unsubscribe) {
    state.unsubscribe();
  }

  const tasksQuery = query(
    collection(db, 'tasks'),
    where('userId', '==', state.user.uid),
    orderBy('order', 'asc')
  );

  state.unsubscribe = onSnapshot(
    tasksQuery,
    (snapshot) => {
      state.tasks = [];
      snapshot.forEach((doc) => {
        state.tasks.push({ id: doc.id, ...doc.data() });
      });
      renderCurrentView();
    },
    (error) => {
      console.error('Error loading tasks:', error);
      showToast('Error loading tasks: ' + error.message, 'error');
    }
  );
}

// Create task
async function createTask(taskData) {
  if (!state.isOnline) {
    showToast('Cannot create task while offline', 'warning');
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, 'tasks'), {
      userId: state.user.uid,
      text: taskData.text || '',
      description: taskData.description || '',
      status: taskData.status || 'backlog',
      priority: taskData.priority || 'normal',
      tags: taskData.tags || [],
      dueDate: taskData.dueDate || null,
      parentId: taskData.parentId || null,
      order: taskData.order ?? Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Add to undo stack
    addToUndoStack({
      type: 'create',
      taskId: docRef.id,
      data: taskData
    });

    showToast('Task created successfully', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    showToast('Error creating task: ' + error.message, 'error', true);
    return null;
  }
}

// Update task
async function updateTask(taskId, updates) {
  if (!state.isOnline) {
    showToast('Cannot update task while offline', 'warning');
    return false;
  }

  try {
    const taskRef = doc(db, 'tasks', taskId);
    
    // Get old data for undo
    const oldTask = state.tasks.find(t => t.id === taskId);
    
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Add to undo stack
    if (oldTask) {
      addToUndoStack({
        type: 'update',
        taskId,
        oldData: oldTask,
        newData: updates
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    showToast('Error updating task: ' + error.message, 'error', true);
    return false;
  }
}

// Delete task
async function deleteTask(taskId) {
  if (!state.isOnline) {
    showToast('Cannot delete task while offline', 'warning');
    return false;
  }

  try {
    const taskRef = doc(db, 'tasks', taskId);
    
    // Get task data for undo
    const task = state.tasks.find(t => t.id === taskId);
    
    // Delete subtasks first
    const subtasks = state.tasks.filter(t => t.parentId === taskId);
    for (const subtask of subtasks) {
      await deleteDoc(doc(db, 'tasks', subtask.id));
    }
    
    await deleteDoc(taskRef);

    // Add to undo stack
    if (task) {
      addToUndoStack({
        type: 'delete',
        taskId,
        data: task,
        subtasks
      });
    }

    showToast('Task deleted', 'success');
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    showToast('Error deleting task: ' + error.message, 'error', true);
    return false;
  }
}

/**
 * UNDO FUNCTIONALITY
 */

function addToUndoStack(action) {
  // Keep only last action
  state.undoStack = [action];
  
  // Show undo toast
  showUndoToast(action);
}

function showUndoToast(action) {
  const messages = {
    'create': 'Task created',
    'update': 'Task updated',
    'delete': 'Task deleted'
  };
  
  showToast(messages[action.type] || 'Action completed', 'info', false, true);
}

async function performUndo() {
  if (state.undoStack.length === 0) {
    showToast('Nothing to undo', 'info');
    return;
  }

  if (!state.isOnline) {
    showToast('Cannot undo while offline', 'warning');
    return;
  }

  const action = state.undoStack.pop();

  try {
    switch (action.type) {
      case 'create':
        await deleteDoc(doc(db, 'tasks', action.taskId));
        showToast('Undo: Task removed', 'info');
        break;
        
      case 'update':
        await updateDoc(doc(db, 'tasks', action.taskId), action.oldData);
        showToast('Undo: Changes reverted', 'info');
        break;
        
      case 'delete':
        // Recreate task
        await addDoc(collection(db, 'tasks'), action.data);
        // Recreate subtasks
        if (action.subtasks) {
          for (const subtask of action.subtasks) {
            await addDoc(collection(db, 'tasks'), subtask);
          }
        }
        showToast('Undo: Task restored', 'info');
        break;
    }
  } catch (error) {
    console.error('Error performing undo:', error);
    showToast('Error undoing action: ' + error.message, 'error', true);
  }
}

/**
 * QUICK INPUT PARSER
 */

function parseQuickInput(input) {
  const taskData = {
    text: input,
    tags: [],
    priority: 'normal',
    status: 'backlog',
    dueDate: null
  };

  // Extract tags (#tag)
  const tagMatches = input.match(/#(\w+)/g);
  if (tagMatches) {
    taskData.tags = tagMatches.map(tag => tag.slice(1));
    taskData.text = input.replace(/#\w+/g, '').trim();
  }

  // Extract priority (!high, !low)
  const priorityMatch = input.match(/!(high|low)/i);
  if (priorityMatch) {
    taskData.priority = priorityMatch[1].toLowerCase();
    taskData.text = taskData.text.replace(/!(high|low)/gi, '').trim();
  }

  // Extract date (today, tomorrow, in X days, specific date with time)
  const dateMatch = input.match(/\b(today|tomorrow|in\s+(\d+)\s+days?)\b/i);
  if (dateMatch) {
    const now = new Date();
    if (dateMatch[1].toLowerCase() === 'today') {
      taskData.dueDate = now.toISOString().split('T')[0];
    } else if (dateMatch[1].toLowerCase() === 'tomorrow') {
      now.setDate(now.getDate() + 1);
      taskData.dueDate = now.toISOString().split('T')[0];
    } else if (dateMatch[2]) {
      now.setDate(now.getDate() + parseInt(dateMatch[2]));
      taskData.dueDate = now.toISOString().split('T')[0];
    }
    taskData.text = taskData.text.replace(/\b(today|tomorrow|in\s+\d+\s+days?)\b/gi, '').trim();
  }

  // Extract time (e.g., "3pm", "15:00")
  const timeMatch = input.match(/\b(\d{1,2}):?(\d{2})?\s*(am|pm)?\b/i);
  if (timeMatch && taskData.dueDate) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
    
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    
    const date = new Date(taskData.dueDate);
    date.setHours(hours, minutes, 0, 0);
    taskData.dueDate = date.toISOString();
    
    taskData.text = taskData.text.replace(/\b\d{1,2}:?\d{0,2}\s*(am|pm)?\b/gi, '').trim();
  }

  // Clean up multiple spaces
  taskData.text = taskData.text.replace(/\s+/g, ' ').trim();

  return taskData;
}

/**
 * KANBAN BOARD
 */

let sortableInstances = {};

function initializeSortable() {
  const columns = ['backlog', 'today', 'inprogress', 'done'];
  
  columns.forEach(status => {
    const container = document.querySelector(`[data-sortable="${status}"]`);
    if (!container) return;

    if (sortableInstances[status]) {
      sortableInstances[status].destroy();
    }

    sortableInstances[status] = new Sortable(container, {
      group: 'tasks',
      animation: 220,
      easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      chosenClass: 'sortable-chosen',
      forceFallback: true,
      fallbackClass: 'sortable-fallback',
      scrollSensitivity: 60,
      scrollSpeed: 15,
      bubbleScroll: true,
      disabled: !state.isOnline,
      
      onEnd: async (evt) => {
        if (!state.isOnline) return;

        const taskId = evt.item.dataset.taskId;
        const newStatus = evt.to.dataset.sortable;
        const newIndex = evt.newIndex;

        // Calculate new order
        const tasksInColumn = state.tasks
          .filter(t => t.status === newStatus && !t.parentId)
          .sort((a, b) => a.order - b.order);

        let newOrder;
        if (tasksInColumn.length === 0) {
          newOrder = Date.now();
        } else if (newIndex === 0) {
          newOrder = tasksInColumn[0].order / 2;
        } else if (newIndex >= tasksInColumn.length) {
          newOrder = tasksInColumn[tasksInColumn.length - 1].order + 1000;
        } else {
          const prev = tasksInColumn[newIndex - 1].order;
          const next = tasksInColumn[newIndex].order;
          newOrder = (prev + next) / 2;
        }

        // Update task
        await updateTask(taskId, {
          status: newStatus,
          order: newOrder
        });
      }
    });
  });
}

function renderKanbanView() {
  const columns = ['backlog', 'today', 'inprogress', 'done'];
  
  columns.forEach(status => {
    const container = document.querySelector(`[data-sortable="${status}"]`);
    const countEl = container.parentElement.querySelector('.column__count');
    
    const tasksInColumn = state.tasks
      .filter(t => t.status === status && !t.parentId)
      .sort((a, b) => a.order - b.order);

    countEl.textContent = tasksInColumn.length;
    container.innerHTML = '';

    tasksInColumn.forEach(task => {
      const card = createTaskCard(task);
      container.appendChild(card);
    });
  });
}

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskId = task.id;
  
  // Priority badge
  let priorityBadge = '';
  if (task.priority !== 'normal') {
    const icons = { high: '🔴', low: '🔵' };
    priorityBadge = `
      <span class="priority-badge priority-badge--${task.priority}">
        ${icons[task.priority] || ''} ${task.priority}
      </span>
    `;
  }

  // Due date
  let dueDateHtml = '';
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    let dueDateClass = 'task-card__due';
    if (due < today) dueDateClass += ' task-card__due--overdue';
    else if (due.getTime() === today.getTime()) dueDateClass += ' task-card__due--today';
    
    dueDateHtml = `
      <span class="${dueDateClass}">
        📅 ${formatDate(dueDate)}
      </span>
    `;
  }

  // Tags
  let tagsHtml = '';
  if (task.tags && task.tags.length > 0) {
    tagsHtml = `
      <div class="task-card__tags">
        ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    `;
  }

  // Subtasks
  const subtasks = state.tasks.filter(t => t.parentId === task.id);
  let subtasksHtml = '';
  if (subtasks.length > 0) {
    const completedCount = subtasks.filter(t => t.status === 'done').length;
    subtasksHtml = `
      <span class="task-card__subtasks">
        ✓ ${completedCount}/${subtasks.length}
      </span>
    `;
  }

  card.innerHTML = `
    <div class="task-card__header">
      <div class="task-card__title">${escapeHtml(task.text)}</div>
      ${task.description ? `<div class="task-card__description">${escapeHtml(task.description)}</div>` : ''}
    </div>
    <div class="task-card__meta">
      ${priorityBadge}
      ${dueDateHtml}
      ${subtasksHtml}
    </div>
    ${tagsHtml}
  `;

  card.addEventListener('click', () => openTaskModal(task));

  return card;
}

/**
 * LIST VIEW
 */

function renderListView() {
  const listContent = document.getElementById('list-content');
  
  // Sort tasks: dueDate ASC (nulls last) → priority (high→low) → order
  const sortedTasks = [...state.tasks]
    .filter(t => !t.parentId)
    .sort((a, b) => {
      // Due date
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && b.dueDate) {
        const dateCompare = new Date(a.dueDate) - new Date(b.dueDate);
        if (dateCompare !== 0) return dateCompare;
      }
      
      // Priority
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityCompare !== 0) return priorityCompare;
      
      // Order
      return a.order - b.order;
    });

  if (sortedTasks.length === 0) {
    listContent.innerHTML = `
      <div class="list-empty">
        <div class="list-empty__icon">📋</div>
        <div class="list-empty__title">No tasks yet</div>
        <div class="list-empty__description">Add your first task using the quick input above</div>
      </div>
    `;
    return;
  }

  listContent.innerHTML = '';
  sortedTasks.forEach(task => {
    const item = createListItem(task);
    listContent.appendChild(item);
  });
}

function createListItem(task) {
  const item = document.createElement('div');
  item.className = 'list-item';
  
  const statusLabels = {
    backlog: 'Backlog',
    today: 'Today',
    inprogress: 'In Progress',
    done: 'Done'
  };

  let dueDateHtml = '';
  if (task.dueDate) {
    dueDateHtml = `<span>📅 ${formatDate(new Date(task.dueDate))}</span>`;
  }

  let tagsHtml = '';
  if (task.tags && task.tags.length > 0) {
    tagsHtml = task.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
  }

  item.innerHTML = `
    <div class="list-item__drag">⋮⋮</div>
    <div class="list-item__content">
      <div class="list-item__title">${escapeHtml(task.text)}</div>
      ${task.description ? `<div class="list-item__description">${escapeHtml(task.description)}</div>` : ''}
      <div class="list-item__meta">
        <span class="status-badge status-badge--${task.status}">${statusLabels[task.status]}</span>
        <span class="priority-badge priority-badge--${task.priority}">${task.priority}</span>
        ${dueDateHtml}
        ${tagsHtml}
      </div>
    </div>
    <div class="list-item__status"></div>
  `;

  item.addEventListener('click', () => openTaskModal(task));

  return item;
}

/**
 * CALENDAR VIEW
 */

let currentCalendarDate = new Date();

function renderCalendarView() {
  updateCalendarHeader();
  renderCalendarGrid();
}

function updateCalendarHeader() {
  const title = document.getElementById('calendar-title');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  title.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
}

function renderCalendarGrid() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  // Day headers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar__day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  // Get calendar days
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days = [];
  const currentDate = new Date(startDate);
  while (days.length < 42) { // 6 weeks
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Render day cells
  days.forEach(date => {
    const cell = createCalendarDay(date, month);
    grid.appendChild(cell);
  });
}

function createCalendarDay(date, currentMonth) {
  const cell = document.createElement('div');
  cell.className = 'calendar__day';
  
  const isOtherMonth = date.getMonth() !== currentMonth;
  const isToday = isSameDay(date, new Date());
  
  if (isOtherMonth) cell.classList.add('calendar__day--other-month');
  if (isToday) cell.classList.add('calendar__day--today');

  const dateStr = date.toISOString().split('T')[0];
  
  // Get tasks for this day
  const tasksOnDay = state.tasks.filter(task => {
    if (!task.dueDate || task.parentId) return false;
    const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
    return taskDate === dateStr;
  });

  let tasksHtml = '';
  if (tasksOnDay.length > 0) {
    if (tasksOnDay.length <= 3) {
      tasksHtml = `
        <div class="calendar__tasks">
          ${tasksOnDay.slice(0, 3).map(task => `
            <div class="calendar__task calendar__task--priority-${task.priority}" 
                 data-task-id="${task.id}">
              ${escapeHtml(task.text)}
            </div>
          `).join('')}
        </div>
      `;
    } else {
      tasksHtml = `<span class="calendar__count">${tasksOnDay.length}</span>`;
    }
  }

  cell.innerHTML = `
    <span class="calendar__day-number">${date.getDate()}</span>
    ${tasksHtml}
  `;

  cell.addEventListener('click', (e) => {
    if (e.target.classList.contains('calendar__task')) {
      const taskId = e.target.dataset.taskId;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) openTaskModal(task);
    } else if (!isOtherMonth) {
      // Click to set due date for quick-add
      const input = elements.quickInput.value.trim();
      if (input) {
        const taskData = parseQuickInput(input);
        taskData.dueDate = dateStr;
        createTask(taskData);
        elements.quickInput.value = '';
      } else {
        showToast(`Click on a day to set due date for new tasks`, 'info');
      }
    }
  });

  return cell;
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * TASK MODAL
 */

function openTaskModal(task = null) {
  state.selectedTask = task;
  
  if (task) {
    // Edit mode
    document.getElementById('task-title-input').value = task.text || '';
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-status').value = task.status || 'backlog';
    document.getElementById('task-priority').value = task.priority || 'normal';
    document.getElementById('task-duedate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
    document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
    
    // Load subtasks
    renderSubtasks();
    
    document.getElementById('delete-task-btn').hidden = false;
  } else {
    // Create mode
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-status').value = 'backlog';
    document.getElementById('task-priority').value = 'normal';
    document.getElementById('task-duedate').value = '';
    document.getElementById('task-tags').value = '';
    document.getElementById('subtasks-list').innerHTML = '';
    document.getElementById('delete-task-btn').hidden = true;
  }
  
  elements.taskModal.hidden = false;
  document.getElementById('task-title-input').focus();
}

function closeTaskModal() {
  elements.taskModal.hidden = true;
  state.selectedTask = null;
}

async function saveTaskFromModal() {
  const title = document.getElementById('task-title-input').value.trim();
  if (!title) {
    showToast('Task title is required', 'warning');
    return;
  }

  const taskData = {
    text: title,
    description: document.getElementById('task-description').value.trim(),
    status: document.getElementById('task-status').value,
    priority: document.getElementById('task-priority').value,
    dueDate: document.getElementById('task-duedate').value || null,
    tags: document.getElementById('task-tags').value
      .split(',')
      .map(t => t.trim())
      .filter(t => t)
  };

  if (state.selectedTask) {
    // Update existing
    await updateTask(state.selectedTask.id, taskData);
    showToast('Task updated', 'success');
  } else {
    // Create new
    await createTask(taskData);
  }

  closeTaskModal();
}

async function deleteTaskFromModal() {
  if (!state.selectedTask) return;
  
  if (confirm('Delete this task and all its subtasks?')) {
    await deleteTask(state.selectedTask.id);
    closeTaskModal();
  }
}

function renderSubtasks() {
  if (!state.selectedTask) return;
  
  const subtasksList = document.getElementById('subtasks-list');
  const subtasks = state.tasks.filter(t => t.parentId === state.selectedTask.id);
  
  subtasksList.innerHTML = '';
  subtasks.forEach(subtask => {
    const item = document.createElement('div');
    item.className = 'subtask-edit';
    item.innerHTML = `
      <input type="checkbox" 
             class="subtask-edit__checkbox" 
             ${subtask.status === 'done' ? 'checked' : ''}
             data-subtask-id="${subtask.id}">
      <input type="text" 
             class="subtask-edit__input" 
             value="${escapeHtml(subtask.text)}"
             data-subtask-id="${subtask.id}">
      <button class="subtask-edit__delete" data-subtask-id="${subtask.id}">🗑️</button>
    `;
    subtasksList.appendChild(item);
  });
}

async function addSubtask() {
  if (!state.selectedTask) return;
  
  const subtaskData = {
    text: 'New subtask',
    status: 'backlog',
    priority: 'normal',
    tags: [],
    dueDate: null,
    parentId: state.selectedTask.id,
    order: Date.now()
  };
  
  await createTask(subtaskData);
  renderSubtasks();
}

/**
 * COMMAND PALETTE
 */

const commands = [
  { id: 'new-task', icon: '➕', title: 'New Task', description: 'Create a new task', shortcut: 'N' },
  { id: 'kanban', icon: '📋', title: 'Kanban View', description: 'Switch to Kanban board' },
  { id: 'list', icon: '📝', title: 'List View', description: 'Switch to List view' },
  { id: 'calendar', icon: '📅', title: 'Calendar View', description: 'Switch to Calendar view' },
  { id: 'toggle-theme', icon: '🎨', title: 'Toggle Theme', description: 'Switch between dark and light mode' },
  { id: 'undo', icon: '↶', title: 'Undo', description: 'Undo last action', shortcut: 'Ctrl+Z' }
];

function openCommandPalette() {
  elements.commandPalette.hidden = false;
  const input = document.getElementById('palette-input');
  input.value = '';
  input.focus();
  renderCommandResults('');
}

function closeCommandPalette() {
  elements.commandPalette.hidden = true;
}

function renderCommandResults(search) {
  const results = document.getElementById('palette-results');
  const filtered = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) {
    results.innerHTML = '<div class="palette__empty">No commands found</div>';
    return;
  }

  results.innerHTML = filtered.map(cmd => `
    <button class="palette-item" data-command="${cmd.id}">
      <span class="palette-item__icon">${cmd.icon}</span>
      <div class="palette-item__content">
        <div class="palette-item__title">${cmd.title}</div>
        <div class="palette-item__description">${cmd.description}</div>
      </div>
      ${cmd.shortcut ? `<div class="palette-item__shortcut"><span class="kbd">${cmd.shortcut}</span></div>` : ''}
    </button>
  `).join('');
}

function executeCommand(commandId) {
  switch (commandId) {
    case 'new-task':
      elements.quickInput.focus();
      break;
    case 'kanban':
    case 'list':
    case 'calendar':
      switchView(commandId);
      break;
    case 'toggle-theme':
      toggleTheme();
      break;
    case 'undo':
      performUndo();
      break;
  }
  closeCommandPalette();
}

/**
 * VIEW SWITCHING
 */

function switchView(view) {
  state.currentView = view;
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.view === view);
  });

  // Hide all views
  elements.kanbanView.hidden = true;
  elements.listView.hidden = true;
  elements.calendarView.hidden = true;

  // Show current view
  switch (view) {
    case 'kanban':
      elements.kanbanView.hidden = false;
      renderKanbanView();
      break;
    case 'list':
      elements.listView.hidden = false;
      renderListView();
      break;
    case 'calendar':
      elements.calendarView.hidden = false;
      renderCalendarView();
      break;
  }
}

function renderCurrentView() {
  switchView(state.currentView);
}

/**
 * THEME TOGGLE
 */

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('theme', state.theme);
}

// Initialize theme
document.documentElement.setAttribute('data-theme', state.theme);

/**
 * OFFLINE DETECTION
 */

function updateOnlineStatus() {
  state.isOnline = navigator.onLine;
  elements.offlineBanner.hidden = state.isOnline;
  
  // Disable sortable when offline
  Object.values(sortableInstances).forEach(instance => {
    instance.option('disabled', !state.isOnline);
  });
  
  if (!state.isOnline) {
    showToast('You are offline. Writes are disabled.', 'warning');
  } else {
    showToast('You are back online', 'success');
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

/**
 * TOAST NOTIFICATIONS
 */

function showToast(message, type = 'info', showRetry = false, showUndo = false) {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  if (showUndo) toast.classList.add('toast--undo');
  
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠️',
    info: 'ℹ️'
  };

  let actionsHtml = '';
  if (showRetry) {
    actionsHtml = `
      <div class="toast__actions">
        <button class="toast__btn" onclick="location.reload()">Retry</button>
      </div>
    `;
  } else if (showUndo) {
    actionsHtml = `
      <div class="toast__actions">
        <button class="toast__btn toast__btn--undo">Undo</button>
      </div>
      <div class="toast__progress"></div>
    `;
  }

  toast.innerHTML = `
    <span class="toast__icon">${icons[type]}</span>
    <div class="toast__content">
      <div class="toast__message">${message}</div>
      ${actionsHtml}
    </div>
    <button class="toast__close" aria-label="Close">×</button>
  `;

  elements.toastContainer.appendChild(toast);

  // Close button
  toast.querySelector('.toast__close').addEventListener('click', () => {
    removeToast(toast);
  });

  // Undo button
  if (showUndo) {
    const undoBtn = toast.querySelector('.toast__btn--undo');
    undoBtn.addEventListener('click', () => {
      performUndo();
      removeToast(toast);
    });
    
    // Auto-remove after 6 seconds
    setTimeout(() => removeToast(toast), 6000);
  } else {
    // Auto-remove after 4 seconds
    setTimeout(() => removeToast(toast), 4000);
  }
}

function removeToast(toast) {
  toast.classList.add('toast--removing');
  setTimeout(() => toast.remove(), 300);
}

/**
 * UTILITY FUNCTIONS
 */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(date) {
  const now = new Date();
  const diff = date - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days < 7) return `In ${days} days`;
  
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

/**
 * EVENT LISTENERS
 */

// Auth form
elements.authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  handleLogin(email, password);
});

elements.signupBtn.addEventListener('click', () => {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }
  handleSignup(email, password);
});

elements.logoutBtn.addEventListener('click', handleLogout);

// Quick add
elements.quickAddBtn.addEventListener('click', async () => {
  const input = elements.quickInput.value.trim();
  if (!input) return;
  
  const taskData = parseQuickInput(input);
  await createTask(taskData);
  elements.quickInput.value = '';
});

elements.quickInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    elements.quickAddBtn.click();
  }
});

// View switching
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchView(btn.dataset.view);
  });
});

// Theme toggle
elements.themeToggle.addEventListener('click', toggleTheme);

// Task modal
document.querySelector('.task-modal__close').addEventListener('click', closeTaskModal);
document.getElementById('save-task-btn').addEventListener('click', saveTaskFromModal);
document.getElementById('delete-task-btn').addEventListener('click', deleteTaskFromModal);
document.getElementById('add-subtask-btn').addEventListener('click', addSubtask);

// Subtasks delegation
document.getElementById('subtasks-list').addEventListener('change', async (e) => {
  if (e.target.classList.contains('subtask-edit__checkbox')) {
    const subtaskId = e.target.dataset.subtaskId;
    await updateTask(subtaskId, { status: e.target.checked ? 'done' : 'backlog' });
    renderSubtasks();
  }
});

document.getElementById('subtasks-list').addEventListener('input', async (e) => {
  if (e.target.classList.contains('subtask-edit__input')) {
    const subtaskId = e.target.dataset.subtaskId;
    await updateTask(subtaskId, { text: e.target.value });
  }
});

document.getElementById('subtasks-list').addEventListener('click', async (e) => {
  if (e.target.classList.contains('subtask-edit__delete')) {
    const subtaskId = e.target.dataset.subtaskId;
    await deleteTask(subtaskId);
    renderSubtasks();
  }
});

// Calendar navigation
document.getElementById('prev-month').addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendarView();
});

document.getElementById('next-month').addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendarView();
});

// Command palette
document.getElementById('palette-input').addEventListener('input', (e) => {
  renderCommandResults(e.target.value);
});

document.getElementById('palette-results').addEventListener('click', (e) => {
  const btn = e.target.closest('.palette-item');
  if (btn) {
    executeCommand(btn.dataset.command);
  }
});

// Modal overlays
elements.authModal.querySelector('.modal__overlay').addEventListener('click', () => {
  // Don't close auth modal by clicking overlay (user must sign in)
});

elements.taskModal.querySelector('.modal__overlay').addEventListener('click', closeTaskModal);
elements.commandPalette.querySelector('.modal__overlay').addEventListener('click', closeCommandPalette);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K - Quick add focus
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    elements.quickInput.focus();
  }
  
  // N - New task
  if (e.key === 'n' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    elements.quickInput.focus();
  }
  
  // Esc - Close modals
  if (e.key === 'Escape') {
    if (!elements.taskModal.hidden) closeTaskModal();
    if (!elements.commandPalette.hidden) closeCommandPalette();
  }
  
  // Ctrl/Cmd + P or / - Command palette
  if (((e.ctrlKey || e.metaKey) && e.key === 'p') || e.key === '/') {
    if (!e.target.matches('input, textarea')) {
      e.preventDefault();
      openCommandPalette();
    }
  }
  
  // Ctrl/Cmd + Z - Undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    performUndo();
  }
});

/**
 * SERVICE WORKER REGISTRATION
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

console.log('TODO App initialized');

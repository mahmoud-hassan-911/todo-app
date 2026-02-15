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
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
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
  theme: localStorage.getItem('theme') || 'dark',
  userDropdownOpen: false,
  /** @type {{ status: string, priority: string }} */
  listFilters: {
    status: 'all',
    priority: 'all'
  }
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
  themeToggle: document.getElementById('theme-toggle'),
  // User profile elements
  userProfileBtn: document.getElementById('user-profile-btn'),
  userDropdown: document.getElementById('user-dropdown'),
  userAvatar: document.getElementById('user-avatar'),
  userDisplayName: document.getElementById('user-display-name'),
  dropdownEmail: document.getElementById('dropdown-email'),
  changePasswordBtn: document.getElementById('change-password-btn'),
  // Password modal elements
  passwordModal: document.getElementById('password-modal'),
  passwordForm: document.getElementById('password-form'),
  currentPasswordInput: document.getElementById('current-password'),
  newPasswordInput: document.getElementById('new-password'),
  confirmPasswordInput: document.getElementById('confirm-password'),
  passwordError: document.getElementById('password-error'),
  passwordSuccess: document.getElementById('password-success'),
  savePasswordBtn: document.getElementById('save-password-btn'),
  cancelPasswordBtn: document.getElementById('cancel-password-btn')
};

/**
 * AUTHENTICATION
 */

/** Show the auth modal */
function showAuthModal() {
  elements.authModal.hidden = false;
  elements.authEmail.focus();
}

/** Hide the auth modal */
function hideAuthModal() {
  elements.authModal.hidden = true;
  elements.authError.hidden = true;
  elements.authForm.reset();
}

/** Handle user login */
async function handleLogin(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    hideAuthModal();
  } catch (error) {
    showAuthError(getAuthErrorMessage(error.code));
  }
}

/** Handle user signup */
async function handleSignup(email, password) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    hideAuthModal();
    showToast('Account created successfully!', 'success');
  } catch (error) {
    showAuthError(getAuthErrorMessage(error.code));
  }
}

/** Handle user logout */
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
    closeUserDropdown();
    showAuthModal();
    showToast('Signed out successfully', 'info');
  } catch (error) {
    showToast('Error signing out: ' + error.message, 'error');
  }
}

/** Show auth error message */
function showAuthError(message) {
  elements.authError.textContent = message;
  elements.authError.hidden = false;
}

/** Get friendly error message for auth errors */
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

/**
 * Update the user profile display in the header
 * @param {Object} user - Firebase user object
 */
function updateUserDisplay(user) {
  if (!user) return;
  
  const email = user.email || '';
  const initial = email.charAt(0).toUpperCase();
  const displayName = user.displayName || email.split('@')[0];
  
  elements.userAvatar.textContent = initial;
  elements.userDisplayName.textContent = displayName;
  elements.dropdownEmail.textContent = email;
}

/**
 * USER DROPDOWN
 */

/** Toggle the user dropdown menu */
function toggleUserDropdown() {
  state.userDropdownOpen = !state.userDropdownOpen;
  elements.userDropdown.hidden = !state.userDropdownOpen;
  elements.userProfileBtn.setAttribute('aria-expanded', state.userDropdownOpen);
}

/** Close the user dropdown menu */
function closeUserDropdown() {
  state.userDropdownOpen = false;
  elements.userDropdown.hidden = true;
  elements.userProfileBtn.setAttribute('aria-expanded', 'false');
}

/**
 * CHANGE PASSWORD
 */

/** Open the password change modal */
function openPasswordModal() {
  closeUserDropdown();
  elements.passwordModal.hidden = false;
  elements.passwordForm.reset();
  elements.passwordError.hidden = true;
  elements.passwordSuccess.hidden = true;
  elements.currentPasswordInput.focus();
}

/** Close the password change modal */
function closePasswordModal() {
  elements.passwordModal.hidden = true;
  elements.passwordForm.reset();
  elements.passwordError.hidden = true;
  elements.passwordSuccess.hidden = true;
}

/** Show password modal error */
function showPasswordError(message) {
  elements.passwordError.textContent = message;
  elements.passwordError.hidden = false;
  elements.passwordSuccess.hidden = true;
}

/** Show password modal success */
function showPasswordSuccess(message) {
  elements.passwordSuccess.textContent = message;
  elements.passwordSuccess.hidden = false;
  elements.passwordError.hidden = true;
}

/**
 * Handle password change
 * Re-authenticates the user, then updates their password.
 */
async function handleChangePassword() {
  const currentPassword = elements.currentPasswordInput.value;
  const newPassword = elements.newPasswordInput.value;
  const confirmPassword = elements.confirmPasswordInput.value;
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showPasswordError('Please fill in all fields.');
    return;
  }
  
  if (newPassword.length < 6) {
    showPasswordError('New password must be at least 6 characters.');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showPasswordError('New passwords do not match.');
    return;
  }
  
  if (currentPassword === newPassword) {
    showPasswordError('New password must be different from current password.');
    return;
  }
  
  // Disable button during operation
  elements.savePasswordBtn.disabled = true;
  elements.savePasswordBtn.textContent = 'Updating...';
  
  try {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    // Re-authenticate first
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
    
    showPasswordSuccess('Password updated successfully!');
    elements.passwordForm.reset();
    
    // Auto-close after a moment
    setTimeout(() => {
      closePasswordModal();
      showToast('Password updated successfully', 'success');
    }, 1500);
    
  } catch (error) {
    let message = 'Failed to update password.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      message = 'Current password is incorrect.';
    } else if (error.code === 'auth/weak-password') {
      message = 'New password is too weak. Use at least 6 characters.';
    } else if (error.code === 'auth/requires-recent-login') {
      message = 'Please sign out and sign back in, then try again.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please try again later.';
    }
    showPasswordError(message);
  } finally {
    elements.savePasswordBtn.disabled = false;
    elements.savePasswordBtn.textContent = 'Update Password';
  }
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    state.user = user;
    elements.app.hidden = false;
    hideAuthModal();
    updateUserDisplay(user);
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

/** Initialize app after auth */
function startApp() {
  loadTasks();
  renderCurrentView();
  initializeSortable();
}

/** Load tasks with realtime sync via onSnapshot */
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

/**
 * Create a new task in Firestore
 * @param {Object} taskData - Task data fields
 * @returns {string|null} Document ID or null on failure
 */
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

/**
 * Update an existing task
 * @param {string} taskId - Firestore document ID
 * @param {Object} updates - Fields to update
 * @returns {boolean} Success status
 */
async function updateTask(taskId, updates) {
  if (!state.isOnline) {
    showToast('Cannot update task while offline', 'warning');
    return false;
  }

  try {
    const taskRef = doc(db, 'tasks', taskId);
    const oldTask = state.tasks.find(t => t.id === taskId);
    
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

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

/**
 * Delete a task and its subtasks
 * @param {string} taskId - Firestore document ID
 * @returns {boolean} Success status
 */
async function deleteTask(taskId) {
  if (!state.isOnline) {
    showToast('Cannot delete task while offline', 'warning');
    return false;
  }

  try {
    const taskRef = doc(db, 'tasks', taskId);
    const task = state.tasks.find(t => t.id === taskId);
    
    // Delete subtasks first
    const subtasks = state.tasks.filter(t => t.parentId === taskId);
    for (const subtask of subtasks) {
      await deleteDoc(doc(db, 'tasks', subtask.id));
    }
    
    await deleteDoc(taskRef);

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
  state.undoStack = [action];
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

/** Perform undo of last action */
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
        await addDoc(collection(db, 'tasks'), action.data);
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
 * Parses natural language input to extract task fields.
 * @param {string} input - Raw input text
 * @returns {Object} Parsed task data
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

  // Extract date (today, tomorrow, in X days)
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

/** Initialize SortableJS instances for each column */
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
      delay: 120,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      
      onEnd: async (evt) => {
        if (!state.isOnline) return;

        const taskId = evt.item.dataset.taskId;
        const newStatus = evt.to.dataset.sortable;
        const newIndex = evt.newIndex;

        // Calculate new order using fractional ordering
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

        await updateTask(taskId, {
          status: newStatus,
          order: newOrder
        });
      }
    });
  });
}

/** Render all Kanban columns */
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

/**
 * Create a task card DOM element
 * @param {Object} task - Task data
 * @returns {HTMLElement} Card element
 */
function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskId = task.id;
  
  let priorityBadge = '';
  if (task.priority !== 'normal') {
    const icons = { high: '🔴', low: '🔵' };
    priorityBadge = `
      <span class="priority-badge priority-badge--${task.priority}">
        ${icons[task.priority] || ''} ${task.priority}
      </span>
    `;
  }

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
    
    dueDateHtml = `<span class="${dueDateClass}">📅 ${formatDate(dueDate)}</span>`;
  }

  let tagsHtml = '';
  if (task.tags && task.tags.length > 0) {
    tagsHtml = `
      <div class="task-card__tags">
        ${task.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    `;
  }

  const subtasks = state.tasks.filter(t => t.parentId === task.id);
  let subtasksHtml = '';
  if (subtasks.length > 0) {
    const completedCount = subtasks.filter(t => t.status === 'done').length;
    subtasksHtml = `<span class="task-card__subtasks">✓ ${completedCount}/${subtasks.length}</span>`;
  }

  card.innerHTML = `
    <div class="task-card__header">
      <div class="task-card__title">${escapeHtml(task.text)}</div>
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

/** Render the list view with sorted and filtered tasks */
function renderListView() {
  const listContent = document.getElementById('list-content');
  
  // Apply filters
  const { status, priority } = state.listFilters;
  
  const sortedTasks = [...state.tasks]
    .filter(t => !t.parentId)
    .filter(t => status === 'all' || t.status === status)
    .filter(t => priority === 'all' || t.priority === priority)
    .sort((a, b) => {
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      if (a.dueDate && b.dueDate) {
        const dateCompare = new Date(a.dueDate) - new Date(b.dueDate);
        if (dateCompare !== 0) return dateCompare;
      }
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityCompare !== 0) return priorityCompare;
      return a.order - b.order;
    });

  // Update filter summary
  updateFilterSummary(sortedTasks.length);

  const totalParentTasks = state.tasks.filter(t => !t.parentId).length;
  const hasFiltersActive = status !== 'all' || priority !== 'all';

  if (totalParentTasks === 0) {
    listContent.innerHTML = `
      <div class="list-empty">
        <div class="list-empty__icon">📋</div>
        <div class="list-empty__title">No tasks yet</div>
        <div class="list-empty__description">Add your first task using the quick input above</div>
      </div>
    `;
    return;
  }

  if (sortedTasks.length === 0 && hasFiltersActive) {
    listContent.innerHTML = `
      <div class="list-empty">
        <div class="list-empty__icon">🔍</div>
        <div class="list-empty__title">No matching tasks</div>
        <div class="list-empty__description">Try adjusting your filters to see more tasks</div>
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

/**
 * Update filter chip active states to reflect current filter state
 */
function syncFilterChipUI() {
  // Status chips
  document.querySelectorAll('#status-filters .filter-chip').forEach(chip => {
    chip.classList.toggle('filter-chip--active', chip.dataset.status === state.listFilters.status);
  });
  // Priority chips
  document.querySelectorAll('#priority-filters .filter-chip').forEach(chip => {
    chip.classList.toggle('filter-chip--active', chip.dataset.priority === state.listFilters.priority);
  });
}

/**
 * Update the filter summary text showing result count and clear button
 * @param {number} count - Number of visible tasks after filtering
 */
function updateFilterSummary(count) {
  const summary = document.getElementById('active-filter-summary');
  const countEl = document.getElementById('filter-count');
  const hasFilters = state.listFilters.status !== 'all' || state.listFilters.priority !== 'all';
  
  summary.hidden = !hasFilters;
  if (hasFilters) {
    const total = state.tasks.filter(t => !t.parentId).length;
    countEl.textContent = `Showing ${count} of ${total} tasks`;
  }
}

/**
 * Reset all list filters to "all"
 */
function clearListFilters() {
  state.listFilters.status = 'all';
  state.listFilters.priority = 'all';
  syncFilterChipUI();
  renderListView();
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
    tagsHtml = task.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  }

  item.innerHTML = `
    <div class="list-item__drag">⋮⋮</div>
    <div class="list-item__content">
      <div class="list-item__title">${escapeHtml(task.text)}</div>
      <div class="list-item__meta">
        <span class="status-badge status-badge--${task.status}">${statusLabels[task.status]}</span>
        <span class="priority-badge priority-badge--${task.priority}">${task.priority}</span>
        ${dueDateHtml}
        ${tagsHtml}
      </div>
    </div>
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

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(day => {
    const header = document.createElement('div');
    header.className = 'calendar__day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days = [];
  const currentDate = new Date(startDate);
  while (days.length < 42) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

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
  
  const tasksOnDay = state.tasks.filter(task => {
    if (!task.dueDate || task.parentId) return false;
    const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
    return taskDate === dateStr;
  });

  let tasksHtml = '';
  if (tasksOnDay.length > 0) {
    if (tasksOnDay.length <= 2) {
      tasksHtml = `
        <div class="calendar__tasks">
          ${tasksOnDay.map(task => `
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
      const input = elements.quickInput.value.trim();
      if (input) {
        const taskData = parseQuickInput(input);
        taskData.dueDate = dateStr;
        createTask(taskData);
        elements.quickInput.value = '';
      } else {
        showToast('Type a task name first, then click a day to set due date', 'info');
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
    document.getElementById('task-title-input').value = task.text || '';
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-status').value = task.status || 'backlog';
    document.getElementById('task-priority').value = task.priority || 'normal';
    document.getElementById('task-duedate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
    document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
    renderSubtasks();
    document.getElementById('delete-task-btn').hidden = false;
  } else {
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
    await updateTask(state.selectedTask.id, taskData);
    showToast('Task updated', 'success');
  } else {
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
  { id: 'change-password', icon: '🔒', title: 'Change Password', description: 'Update your password' },
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
    case 'change-password':
      openPasswordModal();
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
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.view === view);
  });

  elements.kanbanView.hidden = true;
  elements.listView.hidden = true;
  elements.calendarView.hidden = true;

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
  applyTheme(state.theme);
  localStorage.setItem('theme', state.theme);
}

/** Apply theme to the document */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update theme-color meta tag
  const themeColor = theme === 'dark' ? '#0f172a' : '#f8fafc';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
}

// Initialize theme on load
applyTheme(state.theme);

/**
 * OFFLINE DETECTION
 */

function updateOnlineStatus() {
  state.isOnline = navigator.onLine;
  elements.offlineBanner.hidden = state.isOnline;
  
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

  toast.querySelector('.toast__close').addEventListener('click', () => {
    removeToast(toast);
  });

  if (showUndo) {
    const undoBtn = toast.querySelector('.toast__btn--undo');
    undoBtn.addEventListener('click', () => {
      performUndo();
      removeToast(toast);
    });
    setTimeout(() => removeToast(toast), 6000);
  } else {
    setTimeout(() => removeToast(toast), 4000);
  }
}

function removeToast(toast) {
  if (!toast.parentElement) return;
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
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - now) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff < 7) return `In ${diff}d`;
  
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

// List view filters - Status
document.getElementById('status-filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  state.listFilters.status = chip.dataset.status;
  syncFilterChipUI();
  renderListView();
});

// List view filters - Priority
document.getElementById('priority-filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  state.listFilters.priority = chip.dataset.priority;
  syncFilterChipUI();
  renderListView();
});

// Clear all list filters
document.getElementById('clear-filters-btn').addEventListener('click', clearListFilters);

// Theme toggle
elements.themeToggle.addEventListener('click', toggleTheme);

// User profile dropdown
elements.userProfileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleUserDropdown();
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (state.userDropdownOpen && !e.target.closest('#user-dropdown') && !e.target.closest('#user-profile-btn')) {
    closeUserDropdown();
  }
});

// Change password button in dropdown
elements.changePasswordBtn.addEventListener('click', openPasswordModal);

// Password modal events
elements.savePasswordBtn.addEventListener('click', handleChangePassword);
elements.cancelPasswordBtn.addEventListener('click', closePasswordModal);

// Close password modal via overlay
elements.passwordModal.querySelector('.modal__overlay').addEventListener('click', closePasswordModal);
elements.passwordModal.querySelector('.password-modal__close').addEventListener('click', closePasswordModal);

// Submit password form on Enter
elements.confirmPasswordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleChangePassword();
  }
});

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
  // Don't close auth modal by clicking overlay
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
  
  // N - New task (only when not in input)
  if (e.key === 'n' && !e.target.matches('input, textarea, select')) {
    e.preventDefault();
    elements.quickInput.focus();
  }
  
  // Esc - Close modals/dropdown
  if (e.key === 'Escape') {
    if (state.userDropdownOpen) { closeUserDropdown(); return; }
    if (!elements.passwordModal.hidden) { closePasswordModal(); return; }
    if (!elements.taskModal.hidden) { closeTaskModal(); return; }
    if (!elements.commandPalette.hidden) { closeCommandPalette(); return; }
  }
  
  // Ctrl/Cmd + P or / - Command palette
  if (((e.ctrlKey || e.metaKey) && e.key === 'p') || e.key === '/') {
    if (!e.target.matches('input, textarea, select')) {
      e.preventDefault();
      openCommandPalette();
    }
  }
  
  // Ctrl/Cmd + Z - Undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.target.matches('input, textarea, select')) {
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

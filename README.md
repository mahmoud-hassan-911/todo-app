# TODO PWA - Production-Ready Firebase App

A modern, fast, and accessible TODO application built as a Progressive Web App with Firebase Authentication and Firestore realtime sync. Features a beautiful Kanban board with drag-and-drop, natural language task parsing, and offline-first architecture.

![TODO App](docs/screenshot-desktop.png)

## ✨ Features

### Core Functionality
- ✅ **Firebase Authentication** - Email/password sign-up and login
- ✅ **Realtime Sync** - Changes appear instantly across all devices using Firestore `onSnapshot`
- ✅ **Kanban Board** - Drag-and-drop tasks between columns (Backlog, Today, In Progress, Done)
- ✅ **Natural Language Input** - Parse `#tags`, `!priority`, and dates (today, tomorrow, in 3 days)
- ✅ **Multiple Views** - Kanban, List (sorted by due date → priority → order), and Calendar
- ✅ **Subtasks** - One-level nested tasks with progress tracking
- ✅ **Undo** - Single-level undo with 6-second window for last action
- ✅ **Offline Support** - PWA shell loads offline; writes disabled with clear banner
- ✅ **Command Palette** - Quick actions via keyboard shortcuts (Ctrl/Cmd+P or /)

### Modern UI/UX (2026 Design)
- 🎨 Dark mode by default with automatic light mode support
- 🌈 Accessible color palette (WCAG AA compliant, colorblind-safe)
- 📱 Mobile-first responsive design (phones, tablets, laptops, wide screens)
- ✨ Smooth micro-interactions and spring animations
- 🎯 44px minimum touch targets for mobile
- ⌨️ Full keyboard navigation support
- ♿ ARIA attributes for screen readers

### Technical Highlights
- 🚀 **No build tools** - Pure ES modules + CDN libraries
- 🔥 **Firebase v9+** - Modern modular SDK
- 📦 **Minimal bundle** - Fast initial load
- 🎯 **SortableJS** - Smooth drag-and-drop via CDN
- 🧪 **E2E Tests** - Comprehensive Playwright test suite
- 📱 **PWA** - Installable with service worker caching

---

## 🚀 Quick Start

### 1. Prerequisites

- A Firebase project ([Create one here](https://console.firebase.google.com/))
- Python 3 (for local dev server) or any static file server
- Node.js 18+ (for running E2E tests)

### 2. Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable **Authentication** → Email/Password provider
   - Create a **Firestore Database** (start in production mode)

2. **Get Firebase Config**
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy your Firebase configuration

3. **Configure the App**
   ```bash
   # Copy template
   cp firebase-config.template.js firebase-config.js
   
   # Edit firebase-config.js and paste your credentials
   ```

   Example `firebase-config.js`:
   ```javascript
   export const firebaseConfig = {
     apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```

4. **Set Firestore Security Rules**
   
   In Firebase Console → Firestore Database → Rules, paste these rules:

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /tasks/{taskId} {
         // Allow create only if authenticated and userId matches auth.uid
         allow create: if request.auth != null
                       && request.resource.data.userId == request.auth.uid
                       && request.resource.data.text is string
                       && request.resource.data.status in ['backlog','today','inprogress','done']
                       && request.resource.data.priority in ['low','normal','high'];
         
         // Allow read only own tasks
         allow read: if request.auth != null 
                     && resource.data.userId == request.auth.uid;
         
         // Allow update only own tasks, userId cannot be changed
         allow update: if request.auth != null
                       && resource.data.userId == request.auth.uid
                       && (request.resource.data.userId == resource.data.userId);
         
         // Allow delete only own tasks
         allow delete: if request.auth != null 
                       && resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

   **Security Notes:**
   - These rules enforce that users can only access their own tasks
   - `userId` must match `request.auth.uid` on creation
   - `userId` cannot be changed after creation
   - Field validation ensures data integrity
   - For production, consider adding rate limiting and additional validation

### 3. Run Locally

```bash
# Using Python 3
python -m http.server 8080

# Or using Node.js http-server
npx http-server -p 8080

# Or using PHP
php -S localhost:8080
```

Open http://localhost:8080 in your browser.

### 4. Deploy to GitHub Pages

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/todo-app.git
   git push -u origin main
   ```

2. **Configure GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from branch `main` / root directory
   - Save

3. **Important:** Add your GitHub Pages domain to Firebase Authentication
   - Firebase Console → Authentication → Settings → Authorized domains
   - Add `yourusername.github.io`

4. **Update `firebase-config.js`** (if needed for production domain)

Your app will be live at `https://yourusername.github.io/todo-app/`

---

## 🧪 Running Tests

### Install Test Dependencies

```bash
npm install
npm run install:playwright
```

### Run E2E Tests

```bash
# Run all tests
npm test

# Run in headed mode (see browser)
npm run test:headed

# Run in debug mode
npm run test:debug

# View test report
npm run test:report
```

### Test Coverage

The test suite covers:

1. **Authentication** (`tests/auth.spec.js`)
   - Sign up with email/password
   - Login and logout
   - Error handling for invalid credentials

2. **Task Management** (`tests/tasks.spec.js`)
   - Create tasks via quick input
   - Parse natural language (tags, priority, dates)
   - Edit and delete tasks
   - Subtask creation and management

3. **Kanban Board** (`tests/kanban.spec.js`)
   - Drag-and-drop between columns
   - Status updates via drag
   - Column count updates
   - Order persistence

4. **Realtime Sync** (`tests/realtime-sync.spec.js`)
   - Task creation syncs across sessions
   - Task updates appear in real-time
   - Task deletions propagate immediately
   - Tests verify sync within ~3 seconds

5. **View Switching** (`tests/views.spec.js`)
   - Kanban, List, and Calendar views
   - Calendar navigation
   - List sorting (due date → priority → order)

**Note:** Tests require your Firebase configuration in `firebase-config.js`. For CI/CD, use a separate Firebase test project.

---

## 🎨 Design System

### Design Tokens

All design values are centralized in `styles/tokens.css` as CSS custom properties.

#### Color Palette

```css
/* Dark Mode (Default) */
--color-bg-primary: #0f172a;
--color-bg-secondary: #1e293b;
--color-surface: #1e293b;
--color-text-primary: #f8fafc;
--color-accent: #14b8a6;  /* Teal - colorblind safe */

/* Automatically switches via prefers-color-scheme */
```

#### Spacing Scale (4px base)

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-7: 32px
--space-8: 40px
--space-9: 48px
```

#### Typography

```css
--font-family: 'Inter', system-ui, sans-serif;
--font-size-base: clamp(14px, 1.6vw, 16px);  /* Fluid */
```

#### Animation

```css
--duration-fast: 150ms;
--duration-normal: 220ms;
--ease-spring: cubic-bezier(0.2, 0.9, 0.3, 1);
```

### Customizing the Theme

Edit `styles/tokens.css` to change:
- **Colors:** Update `--color-*` variables
- **Spacing:** Adjust `--space-*` scale
- **Typography:** Change `--font-*` values
- **Animations:** Modify `--duration-*` and `--ease-*`

The entire app will update automatically due to CSS custom properties.

### Breakpoints

```css
/* Mobile: 0-640px */
/* Tablet: 641px-1024px */
/* Desktop: 1025px-1440px */
/* Wide: 1441px+ */
```

Mobile-first approach: base styles for mobile, then use `@media (min-width: ...)` for larger screens.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus quick add input |
| `N` | New task (focus quick input) |
| `Esc` | Close modal or palette |
| `Ctrl/Cmd + P` | Open command palette |
| `/` | Open command palette |
| `Ctrl/Cmd + Z` | Undo last action |

---

## 📖 Usage Guide

### Quick Add Natural Language Parser

Type in the quick add input at the top to create tasks with metadata:

```
Fix API bug tomorrow 3pm #backend !high
```

Parsed as:
- **Text:** "Fix API bug"
- **Due Date:** Tomorrow at 3 PM
- **Tags:** `backend`
- **Priority:** High

#### Supported Syntax

- **Tags:** `#tagname` (e.g., `#urgent`, `#backend`)
- **Priority:** `!high`, `!low` (default is `normal`)
- **Dates:**
  - `today`
  - `tomorrow`
  - `in 3 days`
- **Times:** `3pm`, `15:00`, `9:30am`

Multiple tags and modifiers can be combined in any order.

### Kanban Board

- **Drag cards** between columns to change status
- **Click a card** to open detailed editor
- **Auto-scroll** when dragging near edges
- **Order persists** within columns using fractional indexing

### List View

Tasks sorted by:
1. Due date (ascending, nulls last)
2. Priority (high → normal → low)
3. Order (numeric)

### Calendar View

- **Click a day** to set due date for new tasks (enter task text first)
- **Click a task badge** to open the task modal
- **Navigate months** with arrow buttons
- Tasks with due dates appear on their respective days

### Subtasks

1. Open a task modal
2. Click **"+ Add Subtask"**
3. Edit subtask text inline
4. Check/uncheck to mark done
5. Delete with 🗑️ icon

Subtasks are separate Firestore documents with `parentId` field.

### Undo

After creating, updating, or deleting a task:
- A toast appears with an **Undo** button
- Click **Undo** within 6 seconds to revert the action
- Only the last action can be undone

---

## 🌐 Offline Behavior

The app uses a service worker to cache static assets (HTML, CSS, JS, icons) for offline access.

**When offline:**
- ✅ App shell loads (UI is visible)
- ⚠️ Writes are **disabled** (create/update/delete tasks)
- ℹ️ Yellow banner appears: "Offline — writes are disabled. Changes will not be saved."
- 📖 Previously loaded tasks remain visible (Firestore cache)

**When back online:**
- ✅ Banner disappears
- ✅ All features resume
- ✅ Firestore syncs any missed changes from other devices

**Important:** No local persistent storage for tasks. All task data lives in Firestore. Offline mode is read-only.

---

## 📁 Project Structure

```
todo-app/
├── index.html                  # Main HTML
├── app.js                      # Main application logic (ES module)
├── firebase-config.template.js # Firebase config template
├── firebase-config.js          # Your Firebase credentials (gitignored)
├── manifest.json               # PWA manifest
├── service-worker.js           # Offline support
├── package.json                # NPM scripts for tests
├── .gitignore                  # Ignore secrets and dependencies
│
├── styles/
│   ├── tokens.css              # Design system tokens
│   ├── base.css                # Reset and base styles
│   ├── header.css              # Header and navigation
│   ├── auth.css                # Authentication modal
│   ├── board.css               # Kanban board
│   ├── card.css                # Task cards
│   ├── modal.css               # Task detail modal
│   ├── toast.css               # Toast notifications
│   ├── palette.css             # Command palette
│   ├── list.css                # List view
│   └── calendar.css            # Calendar view
│
├── icons/
│   ├── icon.svg                # Vector icon
│   ├── icon-128.png            # PWA icon 128x128
│   └── icon-512.png            # PWA icon 512x512
│
├── tests/
│   ├── setup.md                # Test setup instructions
│   ├── playwright.config.js    # Playwright configuration
│   ├── auth.spec.js            # Auth tests
│   ├── tasks.spec.js           # Task management tests
│   ├── kanban.spec.js          # Kanban drag-drop tests
│   ├── realtime-sync.spec.js   # Realtime sync tests
│   └── views.spec.js           # View switching tests
│
└── README.md                   # This file
```

---

## 🔒 Security

### Firestore Rules

The provided rules enforce:
- Users can only read/write their own tasks
- `userId` must match authenticated user on creation
- `userId` cannot be changed after creation
- Required fields and enum values are validated

### Production Hardening

For production, consider:

1. **Rate Limiting**
   ```javascript
   // Add to Firestore rules
   match /tasks/{taskId} {
     allow create: if request.auth != null
                   && ... existing rules ...
                   && request.time > resource.data.createdAt + duration.seconds(1);
   }
   ```

2. **Field Validation**
   ```javascript
   // Validate field types and ranges
   && request.resource.data.text.size() > 0
   && request.resource.data.text.size() < 500
   && request.resource.data.tags.size() <= 10
   ```

3. **Firebase App Check**
   - Enable App Check to prevent abuse from unauthorized clients
   - Firebase Console → App Check

4. **HTTPS Only**
   - Ensure your domain uses HTTPS
   - GitHub Pages automatically provides HTTPS

---

## 🐛 Known Limitations & Future Enhancements

### Current Limitations

1. **Undo:** Only single-level undo (last action only)
2. **Drag-to-Calendar:** Not implemented (see ticket below)
3. **Fractional Order Precision:** Orders may need periodic cleanup after extensive reordering
4. **Offline Writes:** Not queued for later sync (intentional design choice)

### Future Roadmap

#### Priority 1 - Drag Tasks to Calendar

**Ticket:** Implement drag-from-Kanban-to-Calendar feature

**Steps:**
1. Add `draggable="true"` to `.task-card` elements
2. Listen for `dragstart` event, set `event.dataTransfer` with task ID
3. In calendar view, add `dragover` and `drop` event listeners to `.calendar__day`
4. On drop, call `updateTask(taskId, { dueDate: droppedDate })`
5. Prevent drop on days from other months

**Estimated effort:** 2-3 hours

#### Priority 2 - Features

- [ ] **Recurring tasks** - Daily, weekly, monthly patterns
- [ ] **Task comments** - Collaborative notes
- [ ] **File attachments** - Store in Firebase Storage
- [ ] **Search/filter** - Full-text search across tasks
- [ ] **Bulk actions** - Select multiple tasks
- [ ] **Dark/light mode toggle** - Manual override (currently auto)
- [ ] **Export** - Download tasks as JSON/CSV
- [ ] **Keyboard shortcuts help** - Modal with all shortcuts

#### Priority 3 - Performance

- [ ] **Virtual scrolling** - For lists with 100+ tasks
- [ ] **Pagination** - Load tasks in batches
- [ ] **Optimistic updates** - Update UI before Firestore confirms
- [ ] **Indexed queries** - Add Firestore composite indexes for complex queries

#### Priority 4 - Advanced

- [ ] **Collaboration** - Share tasks with other users
- [ ] **Notifications** - Push notifications for due dates
- [ ] **Time tracking** - Log hours spent on tasks
- [ ] **Analytics** - Task completion metrics

---

## 📸 Screenshots

### Desktop - Kanban View
![Kanban](docs/screenshot-desktop.png)

### Mobile - List View
![Mobile List](docs/screenshot-mobile.png)

### Calendar View
![Calendar](docs/screenshot-calendar.png)

> **Note:** Create a `docs/` folder and add screenshots for better README visuals.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use ES modules (no build tools)
- Follow existing code style
- Add JSDoc comments for public functions
- Write E2E tests for new features
- Ensure accessibility (ARIA, keyboard nav, touch targets)
- Test on mobile devices

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- **Firebase** - Backend and authentication
- **SortableJS** - Drag-and-drop library
- **Inter Font** - Clean, modern typography
- **Playwright** - Reliable E2E testing

---

## 📞 Support

For issues or questions:
- Open a [GitHub Issue](https://github.com/yourusername/todo-app/issues)
- Check [Firebase documentation](https://firebase.google.com/docs)
- Review [Playwright docs](https://playwright.dev)

---

**Built with ❤️ using vanilla JavaScript, Firebase, and modern web standards.**

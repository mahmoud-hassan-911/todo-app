# Feature Documentation

Detailed breakdown of all features, their implementation, and behavior.

## 1. Authentication

### Email/Password Sign-up
- **Location:** `app.js` → `handleSignup()`
- **Firebase Method:** `createUserWithEmailAndPassword()`
- **Behavior:**
  - Validates email format
  - Password minimum 6 characters
  - Creates user in Firebase Auth
  - Automatically signs in after account creation
  - Shows success toast notification

### Login
- **Location:** `app.js` → `handleLogin()`
- **Firebase Method:** `signInWithEmailAndPassword()`
- **Behavior:**
  - Validates credentials
  - Maintains session across page reloads
  - Shows friendly error messages for common failures

### Logout
- **Location:** `app.js` → `handleLogout()`
- **Firebase Method:** `signOut()`
- **Behavior:**
  - Clears user state
  - Unsubscribes from Firestore listeners
  - Shows auth modal
  - Clears task list from memory

### Security
- Only authenticated users can access the app
- Each user sees only their own tasks
- Firestore rules enforce `userId` matching

---

## 2. Task Data Model

### Fields

```javascript
{
  id: string,              // Firestore document ID
  userId: string,          // Auth UID (immutable)
  text: string,            // Task title/description
  description: string,     // Long-form description
  status: enum,            // 'backlog' | 'today' | 'inprogress' | 'done'
  priority: enum,          // 'low' | 'normal' | 'high'
  tags: string[],          // Array of tag strings
  dueDate: ISO8601 | null, // Due date/time or null
  parentId: string | null, // For subtasks, ID of parent task
  order: number,           // Fractional ordering within status column
  createdAt: Timestamp,    // Server timestamp
  updatedAt: Timestamp     // Server timestamp
}
```

### Firestore Collection
- **Collection name:** `tasks`
- **Query:** `where('userId', '==', auth.uid)`
- **Ordering:** `orderBy('order', 'asc')`

---

## 3. Realtime Sync

### Implementation
- **Method:** Firestore `onSnapshot()`
- **Location:** `app.js` → `loadTasks()`
- **Behavior:**
  - Subscribes to query on login
  - Updates state on any change (create/update/delete)
  - Automatically re-renders views
  - Works across devices/tabs instantly

### Performance
- **Query optimization:** Indexed on `userId + order`
- **Minimal re-renders:** Only changed tasks update DOM
- **Offline support:** Firestore caches data locally

---

## 4. Kanban Board

### Columns
1. **Backlog** - Future tasks
2. **Today** - Prioritized for today
3. **In Progress** - Currently working on
4. **Done** - Completed tasks

### Drag & Drop
- **Library:** SortableJS v1.15.1
- **Implementation:** `initializeSortable()`
- **Features:**
  - Drag between columns (changes `status`)
  - Reorder within column (updates `order`)
  - Visual feedback: ghost, drag class, placeholder
  - Auto-scroll at edges
  - Touch-friendly (mobile support)
  - Disabled when offline

### Order Calculation
- **Method:** Fractional indexing
- When dragging to position `i`:
  - If first: `order = prev[0].order / 2`
  - If last: `order = prev[last].order + 1000`
  - Otherwise: `order = (prev[i-1].order + prev[i].order) / 2`

**Note:** After many reorders, precision may decrease. Periodic "reorder normalization" recommended for production.

---

## 5. Quick Add Natural Language Parser

### Location
`app.js` → `parseQuickInput()`

### Supported Syntax

#### Tags
- Format: `#tagname`
- Example: `#backend #urgent #api`
- Extracted into `tags` array
- Removed from `text` field

#### Priority
- Format: `!high` or `!low`
- Example: `Important task !high`
- Sets `priority` field
- Default: `normal`

#### Dates
- **today:** Sets due date to current day
- **tomorrow:** Next day
- **in N days:** N days from now
- Example: `Meeting in 3 days`

#### Times
- Format: `3pm`, `15:00`, `9:30am`
- Must be combined with date
- Example: `Call client tomorrow 3pm`
- Parses hours and minutes into ISO timestamp

### Examples

| Input | Parsed |
|-------|--------|
| `Fix bug #backend !high` | text: "Fix bug", tags: ["backend"], priority: "high" |
| `Call John tomorrow 3pm` | text: "Call John", dueDate: "tomorrow at 3pm" |
| `Review PR in 2 days #review` | text: "Review PR", tags: ["review"], dueDate: "+2 days" |

### Implementation Details
- Uses regex matching
- Processes in order: tags → priority → dates → times
- Removes matched patterns from text
- Cleans up extra whitespace
- All parsing happens client-side (no server)

---

## 6. List View

### Sorting Algorithm
Tasks sorted by:
1. **Due date** (ascending, nulls last)
2. **Priority** (high → normal → low)
3. **Order** (numeric ascending)

### Implementation
```javascript
tasks.sort((a, b) => {
  // Due date comparison
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  if (a.dueDate && b.dueDate) {
    const dateCompare = new Date(a.dueDate) - new Date(b.dueDate);
    if (dateCompare !== 0) return dateCompare;
  }
  
  // Priority comparison
  const priorityOrder = { high: 0, normal: 1, low: 2 };
  const priorityCompare = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (priorityCompare !== 0) return priorityCompare;
  
  // Order comparison
  return a.order - b.order;
});
```

### UI Features
- Compact list items
- Status badge with color coding
- Priority indicator
- Due date with relative formatting
- Tags displayed as pills
- Click to open task modal

---

## 7. Calendar View

### Implementation
- Shows current month by default
- 6-week grid (42 days)
- Day cells show tasks with due dates
- Navigation: Previous/Next month buttons

### Features
- **Click day:** Sets due date for new task (if quick input has text)
- **Click task badge:** Opens task modal
- **Today indicator:** Highlighted with accent color
- **Other month days:** Dimmed and non-interactive
- **Task display:**
  - Up to 3 tasks shown as badges
  - More than 3: Shows count badge

### Date Calculations
- Uses JavaScript `Date` object
- ISO 8601 date strings for storage
- Timezone: User's local time
- Handles month boundaries automatically

---

## 8. Subtasks

### Data Model
- Subtasks are separate documents in `tasks` collection
- `parentId` field links to parent task ID
- All other fields same as regular tasks

### Features
- **Add:** Click "+ Add Subtask" in task modal
- **Edit:** Inline text editing
- **Complete:** Check/uncheck checkbox (updates `status`)
- **Delete:** Click trash icon
- **Display:** Parent card shows progress (e.g., "✓ 2/5")

### Limitations
- **One level only:** Subtasks cannot have subtasks
- **Cascade delete:** Deleting parent deletes all subtasks
- **No drag-drop:** Subtasks don't appear in Kanban (intentional)

---

## 9. Undo Functionality

### Implementation
- **Stack:** Single action (last only)
- **Window:** 6 seconds
- **Actions tracked:**
  - Create task
  - Update task
  - Delete task (including subtasks)

### Behavior
- After action, toast appears with "Undo" button
- Click Undo to revert:
  - **Create:** Deletes the document
  - **Update:** Restores old field values
  - **Delete:** Re-creates document (and subtasks)
- Progress bar shows remaining time
- Only one undo available at a time

### Limitations
- No undo history (only last action)
- No redo functionality
- Undo fails if offline (shows warning)

---

## 10. Offline Support

### PWA Architecture
- **Service Worker:** `service-worker.js`
- **Cache Strategy:** Cache-first for static assets
- **Cached Assets:**
  - HTML, CSS, JS files
  - Icons
  - Manifest
- **Not Cached:**
  - Firebase SDK
  - Firestore data
  - CDN libraries (always fresh)

### Offline Behavior
- **App shell loads:** UI visible, interactions possible
- **Banner displayed:** "Offline — writes are disabled"
- **Reads:** Firestore cached data available
- **Writes:** Disabled completely
  - Create/update/delete buttons show warnings
  - Drag-drop disabled in Kanban
  - Toast: "Cannot [action] while offline"

### Rationale
- **No queued writes:** Prevents conflicts and data loss
- **Read-only mode:** Better UX than showing stale data
- **Clear messaging:** User knows what to expect

### Online Detection
- Listens to `window.online` and `window.offline` events
- Updates `state.isOnline` flag
- Enables/disables features dynamically

---

## 11. Command Palette

### Activation
- **Keyboard:** `Ctrl/Cmd + P` or `/`
- **UI:** (Can add button if desired)

### Commands
- New Task
- Switch to Kanban
- Switch to List
- Switch to Calendar
- Toggle Theme
- Undo

### Features
- **Fuzzy search:** Type to filter commands
- **Keyboard navigation:** Arrow keys + Enter
- **Click:** Mouse/touch support
- **Shortcuts displayed:** Shows keyboard shortcut if available

### Implementation
- Modal overlay
- Command list rendered from `commands` array
- Executes command on selection
- Auto-closes after execution

---

## 12. Theme Toggle

### Modes
- **Dark** (default)
- **Light**

### Implementation
- **Storage:** `localStorage.getItem('theme')`
- **CSS:** `data-theme` attribute on `<html>`
- **Tokens:** CSS custom properties in `styles/tokens.css`
- **Auto-detection:** `prefers-color-scheme` media query

### Behavior
- Clicking theme button toggles mode
- Preference persists across sessions
- Smooth transition between modes
- All colors update automatically via CSS variables

---

## 13. Accessibility Features

### Keyboard Navigation
- All interactive elements focusable
- Visible focus indicators (2px outline)
- Keyboard shortcuts for common actions
- Esc to close modals

### ARIA Attributes
- `role="dialog"` on modals
- `aria-label` on icon buttons
- `aria-pressed` on toggle buttons
- `aria-live` on toast container
- `aria-modal="true"` on modals

### Touch Targets
- Minimum 44x44 pixels
- Tested on mobile devices
- Drag handles visible and large enough

### Color Contrast
- WCAG AA compliant (4.5:1 for text)
- Colorblind-safe palette (teal accent)
- Status colors distinguishable by more than color alone

### Motion
- Respects `prefers-reduced-motion`
- All animations disabled if user preference set

---

## Performance Considerations

### Optimizations
- **Firestore queries:** Indexed on `userId`
- **DOM updates:** Only changed tasks re-render
- **Debouncing:** Input fields use debounce for Firestore writes
- **Lazy loading:** Images/icons load on demand
- **Service worker:** Caches static assets aggressively

### Scalability
- **Task limit:** No hard limit, but performance degrades beyond ~1000 tasks
- **Subtasks:** Recommended max 20 per parent
- **Tags:** Recommended max 10 per task
- **Realtime listeners:** One per user session

### Monitoring
- Check Firestore usage in Firebase Console
- Monitor `onSnapshot` listener count
- Use Chrome DevTools Performance tab for profiling

---

## Security Notes

### Authentication
- Email/password only (can extend to OAuth)
- No password reset UI (use Firebase Auth directly)
- Session persists until logout or token expires

### Authorization
- Firestore rules enforce user isolation
- `userId` validated on all operations
- Cannot read/write other users' data

### Data Validation
- Required fields enforced by rules
- Enum values validated (status, priority)
- Type checking in rules
- Client-side validation for UX

---

## Browser Support

### Tested Browsers
- ✅ Chrome 100+
- ✅ Firefox 100+
- ✅ Safari 15+
- ✅ Edge 100+
- ✅ Mobile Safari (iOS 15+)
- ✅ Chrome Mobile (Android 10+)

### Required Features
- ES6 modules
- CSS custom properties
- Flexbox / Grid
- Service Workers (for PWA)
- IndexedDB (for Firestore cache)

### Fallbacks
- No service worker: App still works, just not offline
- No CSS Grid: Falls back to Flexbox in some places
- No custom properties: Would need CSS compilation (not implemented)

---

**This concludes the feature documentation. For implementation details, see the source code with inline comments.**

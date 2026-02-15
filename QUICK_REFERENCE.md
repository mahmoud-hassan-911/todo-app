# Quick Reference Card

Fast lookup for common tasks and commands.

## 🚀 Quick Start

```bash
# 1. Setup Firebase config
cp firebase-config.template.js firebase-config.js
# Edit firebase-config.js with your credentials

# 2. Run locally
python -m http.server 8080

# 3. Open browser
http://localhost:8080
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Focus quick add |
| `N` | New task |
| `Esc` | Close modal |
| `Ctrl+P` / `Cmd+P` | Command palette |
| `/` | Command palette |
| `Ctrl+Z` / `Cmd+Z` | Undo |

---

## 📝 Quick Add Syntax

```
Task text #tag1 #tag2 !high tomorrow 3pm
```

- **Tags:** `#tagname`
- **Priority:** `!high` or `!low`
- **Dates:** `today`, `tomorrow`, `in 3 days`
- **Times:** `3pm`, `15:00`, `9:30am`

---

## 🧪 Testing Commands

```bash
# Install
npm install

# Run all tests
npm test

# Run in browser (headed mode)
npm run test:headed

# Debug mode
npm run test:debug

# View report
npm run test:report
```

---

## 🔥 Firestore Rules (Copy-Paste)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.text is string
                    && request.resource.data.status in ['backlog','today','inprogress','done']
                    && request.resource.data.priority in ['low','normal','high'];
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow update: if request.auth != null
                    && resource.data.userId == request.auth.uid
                    && (request.resource.data.userId == resource.data.userId);
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🎨 Common Customizations

### Change Accent Color
**File:** `styles/tokens.css`

```css
--color-accent: #14b8a6;  /* Change this */
```

### Adjust Spacing
**File:** `styles/tokens.css`

```css
--space-4: 1rem;  /* Base spacing */
```

### Change Font
**File:** `styles/tokens.css`

```css
--font-family: 'Your Font', sans-serif;
```

---

## 🚢 Deployment (GitHub Pages)

```bash
# 1. Create repo on GitHub
# 2. Push code
git remote add origin https://github.com/user/repo.git
git push -u origin main

# 3. Enable Pages
# Settings → Pages → Source: main branch

# 4. Add domain to Firebase Auth
# Firebase Console → Authentication → Settings → Authorized domains
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app.js` | Main application logic |
| `index.html` | HTML structure |
| `styles/tokens.css` | Design system |
| `service-worker.js` | PWA offline support |
| `firebase-config.js` | Your credentials (create from template) |

---

## 🐛 Troubleshooting

### Tasks Not Loading
- Check Firebase config
- Verify Firestore rules
- Check browser console
- Ensure authenticated

### Service Worker Not Updating
- Change `CACHE_NAME` in service-worker.js
- Hard refresh (Ctrl+Shift+R)
- Clear cache in DevTools

### Auth Errors
- Add domain to Firebase authorized domains
- Check credentials in firebase-config.js
- Verify email/password provider enabled

### PWA Not Installing
- Must be served over HTTPS
- Convert icons to proper PNGs
- Check manifest.json validity

---

## 📊 Task Data Model

```javascript
{
  userId: "auth_uid",           // Required
  text: "Task title",           // Required
  description: "Details",       // Optional
  status: "backlog",            // backlog|today|inprogress|done
  priority: "normal",           // low|normal|high
  tags: ["tag1", "tag2"],       // Array
  dueDate: "2024-12-31",        // ISO or null
  parentId: null,               // For subtasks
  order: 1234567890,            // Fractional ordering
  createdAt: Timestamp,         // Server timestamp
  updatedAt: Timestamp          // Server timestamp
}
```

---

## 🎯 Feature Checklist

- [x] Auth (email/password)
- [x] Realtime sync (onSnapshot)
- [x] Kanban drag & drop
- [x] List view (sorted)
- [x] Calendar view
- [x] Quick add parser
- [x] Subtasks
- [x] Undo (6s window)
- [x] Offline mode (read-only)
- [x] PWA (installable)
- [x] Command palette
- [x] Keyboard shortcuts
- [x] Dark/light theme
- [x] Responsive (mobile-first)
- [x] Accessibility (ARIA, keyboard)

---

## 📱 Responsive Breakpoints

```css
/* Mobile: 0-640px */
@media (max-width: 640px) { }

/* Tablet: 641px-1024px */
@media (min-width: 641px) and (max-width: 1024px) { }

/* Desktop: 1025px-1440px */
@media (min-width: 1025px) { }

/* Wide: 1441px+ */
@media (min-width: 1441px) { }
```

---

## 🔧 Development Tools

### Local Server Options
```bash
# Python 3
python -m http.server 8080

# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

### Browser DevTools
- **Console:** Check for errors
- **Network:** Verify Firestore requests
- **Application:** Service worker, cache, manifest
- **Lighthouse:** PWA audit

---

## 📚 Documentation Files

- **README.md** - Main documentation
- **SETUP.md** - 5-minute quick start
- **FEATURES.md** - Feature implementation details
- **DEPLOYMENT.md** - Multi-platform deployment
- **PROJECT_SUMMARY.md** - Project overview
- **QUICK_REFERENCE.md** - This file

---

## 🔗 Useful Links

- **Firebase Console:** https://console.firebase.google.com/
- **GitHub Pages Docs:** https://pages.github.com/
- **Playwright Docs:** https://playwright.dev/
- **SortableJS Docs:** https://github.com/SortableJS/Sortable
- **PWA Checklist:** https://web.dev/pwa-checklist/

---

## 💡 Pro Tips

1. **Use Command Palette** - Press `/` for quick actions
2. **Natural Language** - Type `Fix bug tomorrow #urgent !high` in quick add
3. **Drag Anywhere** - Grab task cards from any part, not just handle
4. **Undo Window** - You have 6 seconds to undo any action
5. **Keyboard First** - Most actions have keyboard shortcuts
6. **Offline Aware** - Yellow banner tells you when writes are disabled
7. **Subtasks** - Click task → Add Subtask → Track progress
8. **Calendar Quick Add** - Type task text, then click calendar day to set due date

---

## 🎓 Learning Resources

### Firebase
- Auth: https://firebase.google.com/docs/auth
- Firestore: https://firebase.google.com/docs/firestore
- Security Rules: https://firebase.google.com/docs/rules

### PWA
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Web Manifest: https://developer.mozilla.org/en-US/docs/Web/Manifest

### Testing
- Playwright: https://playwright.dev/docs/intro
- E2E Best Practices: https://playwright.dev/docs/best-practices

---

## 🤝 Contributing

1. Fork the repo
2. Create branch: `git checkout -b feature/name`
3. Make changes
4. Test: `npm test`
5. Commit: `git commit -m "Add feature"`
6. Push: `git push origin feature/name`
7. Open Pull Request

---

## 📞 Get Help

- **GitHub Issues:** Report bugs or request features
- **Firebase Support:** https://firebase.google.com/support
- **Stack Overflow:** Tag questions with `firebase`, `pwa`, `playwright`

---

**Keep this reference handy for quick lookups!** 📌

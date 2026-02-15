# Quick Setup Guide

Follow these steps to get the TODO PWA app running in under 5 minutes.

## Step 1: Firebase Project Setup (2 minutes)

1. Go to https://console.firebase.google.com/
2. Click **"Add project"** or use existing project
3. Enter project name, click Continue
4. Disable Google Analytics (optional), click Continue
5. Wait for project to be created

## Step 2: Enable Authentication (1 minute)

1. In Firebase Console, click **Authentication** in left sidebar
2. Click **Get Started**
3. Click **Email/Password** under Sign-in providers
4. Toggle **Enable**, click **Save**

## Step 3: Create Firestore Database (1 minute)

1. In Firebase Console, click **Firestore Database** in left sidebar
2. Click **Create database**
3. Choose **Start in production mode**, click **Next**
4. Select location (e.g., `us-central`), click **Enable**
5. Go to **Rules** tab
6. Copy and paste the rules from README.md (under "Set Firestore Security Rules")
7. Click **Publish**

## Step 4: Get Firebase Config (1 minute)

1. Click **⚙️ Project settings** (gear icon near "Project Overview")
2. Scroll to **"Your apps"** section
3. Click **</>** (Web) icon to add a web app
4. Enter app nickname (e.g., "TODO PWA"), click **Register app**
5. **Copy the `firebaseConfig` object**

Example:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
};
```

## Step 5: Configure App (30 seconds)

1. Open `firebase-config.template.js`
2. Copy to `firebase-config.js`:
   ```bash
   cp firebase-config.template.js firebase-config.js
   ```
3. Paste your Firebase config into `firebase-config.js`

Example `firebase-config.js`:
```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "my-todo-app.firebaseapp.com",
  projectId: "my-todo-app",
  storageBucket: "my-todo-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

## Step 6: Run Locally (30 seconds)

```bash
# Using Python 3 (pre-installed on most systems)
python -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

Open http://localhost:8080 in your browser.

## Step 7: Test the App (1 minute)

1. You should see the auth modal
2. Enter an email and password
3. Click **"Create Account"**
4. You should see the Kanban board
5. Type in the quick add: `Test task #demo !high`
6. Click the **+** button
7. Task should appear in the Backlog column

**✅ Setup complete!**

---

## Troubleshooting

### Issue: "Firebase not defined" error

**Solution:** Make sure `firebase-config.js` exists and has valid credentials.

### Issue: "Permission denied" in Firestore

**Solution:** 
1. Check Firestore rules are published
2. Verify you're signed in (check browser console for auth errors)
3. Make sure `userId` field matches authenticated user UID

### Issue: Tasks not syncing

**Solution:**
1. Check browser console for errors
2. Verify Firestore database is created and rules are set
3. Check network tab - Firestore requests should succeed (200/204)

### Issue: PWA not installing

**Solution:**
1. Serve over HTTPS (required for PWA)
2. Check manifest.json is valid
3. Verify service-worker.js is registered (check Application tab in DevTools)
4. Icons must be valid PNG files (convert icon.svg to PNG)

---

## Converting SVG Icons to PNG

The app includes an SVG icon. For proper PWA support, convert to PNG:

### Using Online Tool (Easiest)
1. Go to https://convertio.co/svg-png/
2. Upload `icons/icon.svg`
3. Download and rename to `icon-128.png` and `icon-512.png`

### Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# On macOS: brew install imagemagick
# On Ubuntu: sudo apt install imagemagick

# Convert
convert icons/icon.svg -resize 128x128 icons/icon-128.png
convert icons/icon.svg -resize 512x512 icons/icon-512.png
```

### Using Inkscape
1. Open `icons/icon.svg` in Inkscape
2. File → Export PNG Image
3. Set Width/Height to 128, export as `icon-128.png`
4. Repeat for 512x512 → `icon-512.png`

---

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Run E2E tests: `npm install && npm test`
- Customize the design in `styles/tokens.css`
- Deploy to GitHub Pages (see README.md)

---

**Need help?** Open an issue on GitHub or check the Firebase documentation.

# Deployment Guide

Comprehensive guide to deploying the TODO PWA to various platforms.

## Table of Contents
1. [GitHub Pages (Recommended)](#github-pages)
2. [Vercel](#vercel)
3. [Netlify](#netlify)
4. [Firebase Hosting](#firebase-hosting)
5. [Custom Server](#custom-server)

---

## GitHub Pages

### Prerequisites
- GitHub account
- Repository with your app code

### Steps

1. **Prepare Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create GitHub Repository**
   - Go to https://github.com/new
   - Enter repository name (e.g., `todo-pwa`)
   - Don't initialize with README (you already have one)
   - Click **Create repository**

3. **Push Code**
   ```bash
   git remote add origin https://github.com/yourusername/todo-pwa.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to repository **Settings**
   - Scroll to **Pages** section
   - Source: **Deploy from a branch**
   - Branch: **main** / **root**
   - Click **Save**

5. **Wait for Deployment**
   - GitHub will build and deploy (2-3 minutes)
   - Check Actions tab for progress
   - Site will be live at `https://yourusername.github.io/todo-pwa/`

6. **Configure Firebase**
   - Go to Firebase Console → Authentication → Settings
   - Add authorized domain: `yourusername.github.io`

### Custom Domain (Optional)

1. **Add CNAME File**
   ```bash
   echo "yourdomain.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

2. **Configure DNS**
   Add these records to your DNS provider:
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   
   Type: CNAME
   Name: www
   Value: yourusername.github.io
   ```

3. **Enable HTTPS**
   - In GitHub Pages settings, check **Enforce HTTPS**

---

## Vercel

### Deploy with Git

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow Prompts**
   - Link to existing project or create new
   - Deploy

### Deploy with GitHub Integration

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - Framework Preset: **Other**
   - Build Command: (leave empty)
   - Output Directory: `.` (current directory)
4. Click **Deploy**

### Environment Variables
- Not needed for this app (config is in firebase-config.js)

---

## Netlify

### Drag & Drop Deploy

1. Build your site (no build step needed for this app)
2. Go to https://app.netlify.com/drop
3. Drag the entire project folder
4. Site deployed instantly

### Git Integration

1. Go to https://app.netlify.com/
2. Click **Add new site** → **Import an existing project**
3. Connect GitHub account
4. Select repository
5. Configure:
   - Build command: (leave empty)
   - Publish directory: `.`
6. Click **Deploy site**

### Custom Domain
- In Netlify dashboard, go to **Domain settings**
- Add custom domain
- Follow DNS configuration instructions

---

## Firebase Hosting

### Prerequisites
- Firebase CLI installed
- Firebase project created

### Steps

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login**
   ```bash
   firebase login
   ```

3. **Initialize Hosting**
   ```bash
   firebase init hosting
   ```

   Select:
   - Use existing project (your Firebase project)
   - Public directory: `.` (current directory)
   - Configure as single-page app: **Yes**
   - Set up automatic builds with GitHub: **No** (optional)
   - Overwrite index.html: **No**

4. **Deploy**
   ```bash
   firebase deploy --only hosting
   ```

5. **Access Site**
   - Your app will be live at `https://your-project.web.app`

### Update Deployment
```bash
# Make changes
git commit -am "Update app"

# Redeploy
firebase deploy --only hosting
```

---

## Custom Server (VPS / Shared Hosting)

### Requirements
- Web server (Nginx, Apache, etc.)
- SSH access
- HTTPS certificate (Let's Encrypt recommended)

### Nginx Example

1. **Upload Files**
   ```bash
   scp -r * user@yourserver.com:/var/www/todo-pwa/
   ```

2. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name yourdomain.com www.yourdomain.com;
       
       # Redirect to HTTPS
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;
       
       # SSL certificates
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       
       root /var/www/todo-pwa;
       index index.html;
       
       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       
       # Service Worker requires correct MIME type
       location ~* \.js$ {
           add_header Content-Type application/javascript;
       }
       
       # Cache static assets
       location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
       
       # SPA routing - serve index.html for all routes
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Restart Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

### Apache Example

1. **Upload Files**
   ```bash
   scp -r * user@yourserver.com:/var/www/html/todo-pwa/
   ```

2. **.htaccess**
   ```apache
   # Enable RewriteEngine
   RewriteEngine On
   
   # HTTPS redirect
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   
   # SPA routing
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ /index.html [L]
   
   # Security headers
   Header set X-Frame-Options "SAMEORIGIN"
   Header set X-Content-Type-Options "nosniff"
   Header set X-XSS-Protection "1; mode=block"
   
   # Cache static assets
   <FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
       ExpiresActive On
       ExpiresDefault "access plus 1 year"
       Header set Cache-Control "public, immutable"
   </FilesMatch>
   ```

---

## Post-Deployment Checklist

### 1. Test Core Functionality
- [ ] Auth (sign up, login, logout)
- [ ] Create task
- [ ] Drag & drop between columns
- [ ] Open task modal
- [ ] Delete task
- [ ] Switch views (Kanban, List, Calendar)

### 2. Test PWA Features
- [ ] Manifest loads correctly
- [ ] Service worker registers
- [ ] App is installable
- [ ] Offline mode works (show banner)
- [ ] Icons display correctly

### 3. Verify Firebase
- [ ] Domain added to authorized domains
- [ ] Firestore rules published
- [ ] Authentication works from production URL
- [ ] Realtime sync functions

### 4. Performance Check
- [ ] Run Lighthouse audit (aim for 90+ PWA score)
- [ ] Check load time (< 3 seconds)
- [ ] Test on mobile devices
- [ ] Verify responsive design

### 5. Security Check
- [ ] HTTPS enabled
- [ ] firebase-config.js not in public repo (if secrets)
- [ ] Firestore rules restrict access
- [ ] No console errors

---

## CI/CD Setup (GitHub Actions)

### Automated Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Pages
        uses: actions/configure-pages@v3
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: '.'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### Automated Tests Before Deploy

```yaml
name: Test and Deploy

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run tests
        run: npm test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: success()
    steps:
      # Deploy steps here
```

---

## Troubleshooting

### Issue: 404 on Page Refresh

**Cause:** SPA routing not configured

**Solution:** 
- GitHub Pages: Use hash router or add 404.html redirecting to index.html
- Other hosts: Configure server to serve index.html for all routes

### Issue: Service Worker Not Updating

**Cause:** Aggressive caching

**Solution:**
1. Update `CACHE_NAME` in service-worker.js
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)

### Issue: Firebase Auth Domain Error

**Cause:** Domain not authorized

**Solution:**
- Firebase Console → Authentication → Settings → Authorized domains
- Add your production domain

### Issue: Mixed Content (HTTP/HTTPS)

**Cause:** Loading HTTP resources on HTTPS page

**Solution:**
- Ensure all resources use HTTPS
- Firebase SDK automatically uses HTTPS
- Check CDN links

---

## Monitoring & Analytics

### Firebase Analytics

1. Enable Analytics in Firebase Console
2. Add Analytics snippet to index.html:
   ```javascript
   import { getAnalytics } from 'firebase/analytics';
   const analytics = getAnalytics(app);
   ```

### Error Tracking

Use Sentry or similar:

```javascript
// Add to app.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### Performance Monitoring

Firebase Performance Monitoring:

```javascript
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

---

## Rollback Strategy

### GitHub Pages
```bash
# Revert to previous commit
git revert HEAD
git push
```

### Firebase Hosting
```bash
# List releases
firebase hosting:channel:list

# Rollback
firebase hosting:rollback
```

---

## Backup & Recovery

### Export Firestore Data

```bash
# Using gcloud CLI
gcloud firestore export gs://your-bucket/backup-$(date +%Y%m%d)
```

### Restore Firestore Data

```bash
gcloud firestore import gs://your-bucket/backup-YYYYMMDD
```

---

**Deployment complete! Your TODO PWA is now live and accessible worldwide.** 🎉

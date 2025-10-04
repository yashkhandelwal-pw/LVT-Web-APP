# Live Visit Tracker - Cloud Deployment Guide

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

#### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)

#### Steps:
1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect the configuration
   - Click "Deploy"

3. **Configure Environment Variables (if needed):**
   - Go to Project Settings → Environment Variables
   - Add any sensitive configurations

#### Vercel Configuration
- Framework: Static Site
- Build Command: `echo "Static build"`
- Output Directory: `.`
- Install Command: `npm install`

---

### Option 2: Netlify

#### Prerequisites
- GitHub account
- Netlify account (free at netlify.com)

#### Steps:
1. **Push to GitHub** (same as Vercel)

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect GitHub and select your repository
   - Netlify will auto-detect the configuration
   - Click "Deploy site"

3. **Configure Build Settings:**
   - Build command: `echo "Static build"`
   - Publish directory: `.`

---

### Option 3: GitHub Pages

#### Steps:
1. **Push to GitHub** (same as above)

2. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)

3. **Access your site:**
   - Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

---

## 🔧 Pre-Deployment Checklist

### ✅ Required Files
- [x] `app.html` - Main application
- [x] `index.html` - Entry point
- [x] `js/` folder with all JavaScript files
- [x] `package.json` - Dependencies
- [x] `vercel.json` - Vercel configuration
- [x] `netlify.toml` - Netlify configuration

### ✅ Configuration Files
- [x] `js/config.js` - Contains all API keys and configurations
- [x] `js/supabase-client.js` - Database client
- [x] `js/google-sheets.js` - Google APIs integration
- [x] `js/app.js` - Main application logic

### ⚠️ Important Notes

1. **API Keys Security:**
   - All API keys are in `js/config.js`
   - These will be visible in the client-side code
   - For production, consider using environment variables

2. **CORS Configuration:**
   - Update Google OAuth client settings with your new domain
   - Add your deployed URL to authorized origins

3. **Supabase Configuration:**
   - No changes needed for Supabase
   - Uses public anon key (safe for client-side)

## 🌐 Post-Deployment Steps

### 1. Update Google OAuth Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add your deployed domain to:
   - **Authorized JavaScript origins:**
     - `https://your-app.vercel.app` (for Vercel)
     - `https://your-app.netlify.app` (for Netlify)
     - `https://your-username.github.io` (for GitHub Pages)
   - **Authorized redirect URIs:**
     - `https://your-app.vercel.app` (for Vercel)
     - `https://your-app.netlify.app` (for Netlify)
     - `https://your-username.github.io` (for GitHub Pages)

### 2. Test Your Deployed App
1. Visit your deployed URL
2. Test the complete flow:
   - Login with email
   - Fill out the form
   - Upload an image
   - Submit the form
   - Verify data in Google Sheets

### 3. Share Your App
- Share the deployed URL with your team
- The app will be accessible from anywhere
- No local server setup required

## 📱 Mobile Access
Your deployed app will work on:
- Desktop browsers
- Mobile browsers
- Tablet devices
- Progressive Web App (PWA) if configured

## 🔄 Updates and Maintenance
- Push changes to GitHub
- Vercel/Netlify will automatically redeploy
- No manual deployment needed

## 🆘 Troubleshooting

### Common Issues:
1. **CORS Errors:** Update Google OAuth settings
2. **API Errors:** Check console for error messages
3. **Build Failures:** Check build logs in deployment platform

### Support:
- Check browser console for errors
- Verify all files are uploaded correctly
- Ensure API keys are correct in `config.js`

# MAYAK 3D - Deploy to Vercel in 5 Minutes

## ⚡ Quick Start

Your MAYAK 3D project is ready for instant deployment to Vercel!

### What You'll Get
- 🌐 Live web app at: `https://mayak-3d-filipasao-lgtm.vercel.app/`
- 🚀 Auto-deploys on every GitHub push
- 💰 Free forever
- 🔄 Automatic HTTPS and CDN

---

## 📋 Prerequisites (1 minute)

1. **Create GitHub Account** (free)
   - Go to https://github.com/signup
   - Complete signup

2. **Create Vercel Account** (free)
   - Go to https://vercel.com/signup
   - Click "Continue with GitHub"
   - Authorize connection

---

## 🚀 Deploy in 3 Steps

### Step 1: Push to GitHub (2 minutes)

First, ensure you have Git installed. If not, download from: https://git-scm.com/download/win

Then run these commands:

```powershell
# Open PowerShell in your MAYAK-3D folder

cd e:\MAYAK-3D

# Initialize git
git init
git add .
git commit -m "Initial MAYAK 3D commit"

# Create a repository on GitHub first at https://github.com/new
# Then replace with YOUR details:
git branch -M main
git remote add origin https://github.com/filipasao-lgtm/mayak-3d.git
git push -u origin main
```

### Step 2: Connect to Vercel (1 minute)

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Click **Import Git Repository**
4. Find and select your `mayak-3d` repo
5. Click **Import**

### Step 3: Deploy (automatic!)

Vercel automatically deploys. Settings are already configured in `vercel.json`:
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ Framework: Vite + React

**Wait 2-3 minutes for build to complete.**

---

## ✅ Success!

Your app is live! 

**Access it at:**
```
https://mayak-3d-filipasao-lgtm.vercel.app/
```
---

## 🔄 Automatic Updates

After initial setup, every time you push to GitHub, Vercel auto-deploys:

```powershell
# Make changes
git add .
git commit -m "Description of changes"
git push
# Wait 2-3 minutes → Your site updates automatically!
```

---

## 📱 Share Your App

Send this link to anyone:
```
https://mayak-3d-filipasao-lgtm.vercel.app/
```

They can use it immediately in any browser, any device!

---

## 🆘 Troubleshooting

### "Build failed" error?
- Check Vercel dashboard logs (show exact error)
- Most common: typo in GitHub URL
- Fix and push again: `git push`

### App shows blank page?
- Open DevTools (F12 → Console)
- Check for errors
- Vercel logs show server-side issues
- Click "Redeploy" in Vercel dashboard

### Want custom domain?
- In Vercel dashboard → Project Settings → Domains
- Add your domain (costs depends on registrar)
- Free `.vercel.app` subdomain included

---

## 📚 What Was Configured

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel deployment settings |
| `package.json` | Build scripts and dependencies |
| `vite.config.js` | Vite build config |
| `.gitignore` | Excludes node_modules, dist, etc. |

Everything is ready. Just push to GitHub and Vercel handles the rest!

---

## 🎯 Next Steps

1. ✅ Install Git
2. ✅ Create GitHub account
3. ✅ Create GitHub repo at https://github.com/new
4. ✅ Run git commands above
5. ✅ Connect to Vercel
6. ✅ **Your app is live!**

---

**Questions?**
- Vercel docs: https://vercel.com/docs
- GitHub docs: https://docs.github.com

**Total time: ~10 minutes** ⏱️
**Cost: Free forever** 💰

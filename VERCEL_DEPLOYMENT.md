# Deploy to Vercel - Step by Step

## What is Vercel?
Vercel is a free platform that hosts your React app. Your project will be live at a unique URL like: `https://mayak-3d.vercel.app/`

## Prerequisites
- GitHub account (free at github.com)
- Vercel account (free at vercel.com)

---

## Step 1: Create GitHub Repository

### Option A: Using GitHub Website (Easiest)
1. Go to **https://github.com/new**
2. Repository name: `mayak-3d`
3. Description: `Interactive 3D Cassette Player`
4. Choose: **Public** (so it's shareable)
5. Click **Create repository**
6. Copy the HTTPS URL (looks like: `https://github.com/yourusername/mayak-3d.git`)

### Option B: Using Git Command Line
```bash
cd e:\MAYAK-3D
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/mayak-3d.git
git push -u origin main
```

---

## Step 2: Connect to Vercel

1. Go to **https://vercel.com/signup**
2. Sign up with GitHub (choose "Continue with GitHub")
3. Authorize Vercel to access your GitHub account
4. Click **Import Project**
5. Paste your GitHub repo URL or select it from the list
6. Click **Import**

### Vercel Settings (keep defaults):
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

7. Click **Deploy**
8. Wait 2-3 minutes for build to complete
9. **Done!** Your URL will appear (e.g., `https://mayak-3d.vercel.app/`)

---

## Step 3: Share Your Link

Once deployed, you have:
- **Live web app:** `https://mayak-3d.vercel.app/`
- **GitHub repo:** `https://github.com/yourusername/mayak-3d`

---

## Automatic Updates

Every time you:
1. Make changes locally
2. Commit: `git commit -m "Your message"`
3. Push: `git push`

**Vercel automatically redeploys** your site in ~2-3 minutes. No manual steps needed!

---

## Troubleshooting

### Build fails?
- Check the Vercel logs (they show exact errors)
- Most common: missing dependencies in `package.json`

### App shows blank screen?
- Check browser console (F12 → Console tab)
- Verify `./mayak.glb` path is correct
- The build includes all assets in `dist/` folder

### App loads slow?
- First load might be slow (downloads all assets)
- Refresh page - it will be cached and much faster
- Use Vercel's analytics to identify bottlenecks

---

## Next Steps

1. Push this project to GitHub
2. Connect to Vercel
3. Share your link: `https://yourusername-mayak-3d.vercel.app/`
4. Or customize domain in Vercel settings

---

## Quick Command Reference

```bash
# Initialize and push to GitHub
cd e:\MAYAK-3D
git add .
git commit -m "Initial commit"
git push origin main

# After making changes
git add .
git commit -m "Description of changes"
git push

# Vercel will auto-deploy!
```

---

**Total time:** ~10 minutes (including build on Vercel)
**Cost:** Free forever on Vercel's hobby plan

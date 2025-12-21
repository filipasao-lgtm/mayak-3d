# Files to Copy to USB - Browser Version

## What You Need to Copy (Minimal Setup)

The essential files are:

```
USB_DRIVE/
├── launch.bat              (192 bytes)
├── server.js               (~1 KB)
├── package.json            (~2 KB)
│
└── dist/                   (~1.3 MB total)
    ├── index.html          
    ├── mayak.glb           (3D model - important!)
    └── assets/
        ├── index-*.js      (JavaScript - ~360 KB)
        ├── index-*.css     (Styles - ~5 KB)
        └── other files...
```

**Total size: ~1.3 MB** (Electron version was 1.5+ GB!)

---

## Step-by-Step Copy Instructions

### Quick Method (Copy Everything)

1. Open two File Explorer windows
2. Left: Navigate to `e:\MAYAK-3D\`
3. Right: Navigate to your USB root
4. **Copy these 3 files:**
   - `launch.bat`
   - `server.js`
   - `package.json`
5. **Copy this folder:**
   - `dist/` (entire folder with all contents)
6. **Optional - Copy documentation:**
   - `USB_SETUP_GUIDE.md`
   - `BUILD_INSTRUCTIONS.md`

That's it! You now have everything needed.

---

## On Any PC (First Time Setup)

1. **Install Node.js** (if not already installed)
   - Go to https://nodejs.org/
   - Click LTS (Long Term Support)
   - Download and run installer
   - Click "Next" for all defaults
   - Restart PC

2. **Run the App**
   - Plug in USB drive
   - Open USB in File Explorer
   - Double-click `launch.bat`
   - App opens in browser in ~3 seconds
   - Done!

---

## What Each File Does

| File | Purpose | Size |
|------|---------|------|
| `launch.bat` | Windows launcher (double-click this) | 192 B |
| `server.js` | HTTP server that runs the app | 1 KB |
| `package.json` | Node.js configuration (must have) | 2 KB |
| `dist/index.html` | Web app entry point | 480 B |
| `dist/mayak.glb` | 3D cassette model | 800 KB |
| `dist/assets/index-*.js` | Application code | 360 KB |
| `dist/assets/index-*.css` | Styling | 5 KB |

---

## Optional: Pre-install node_modules for Offline Use

If you want to avoid Node.js installation requirement:

1. On the development PC, run:
   ```bash
   cd e:\MAYAK-3D
   npm install
   ```

2. Copy the `node_modules/` folder to USB as well
   - This is large (~200+ MB) but allows offline use
   - Without it, npm will download packages from internet on first run

---

## What NOT to Copy

You don't need these files on USB:

- ❌ `electron-main.js` - Only for Electron version
- ❌ `preload.js` - Only for Electron version
- ❌ `src/` - Source code (already compiled to dist/)
- ❌ `.git/` - Version control (if present)
- ❌ `node_modules/` - Optional (app will fetch if needed)
- ❌ Build files - Only `dist/` is needed

---

## Verification Checklist

Before using the USB, verify:

- [ ] `launch.bat` exists in root
- [ ] `server.js` exists in root
- [ ] `package.json` exists in root
- [ ] `dist/` folder exists
- [ ] `dist/index.html` exists
- [ ] `dist/mayak.glb` exists
- [ ] `dist/assets/` folder exists with JS files

---

## Size Comparison

| Version | Size | Installation | Cross-Platform |
|---------|------|--------------|-----------------|
| **Browser (USB)** | ~1.3 MB | Node.js only | ✅ Windows/Mac/Linux |
| Old Electron | 1.5+ GB | Electron built-in | ❌ Windows only |

**Browser version is 1000x smaller!**

---

## Troubleshooting

**"launch.bat opens Command Prompt then closes"**
- Node.js is not installed or not in PATH
- Install from https://nodejs.org/
- Restart PC after installation

**"Cannot find dist folder"**
- Make sure you copied the `dist/` folder
- The executable can't run without it

**"localhost:3000 in browser shows blank page"**
- Wait 3-5 seconds for server to fully start
- Check server.js is in the root folder
- Refresh the browser

---

## To Create a New USB

Simply repeat the copy steps. The app is completely self-contained - no registry changes, no hidden files, just the files you copied.

To remove: Delete the USB files or reformat the drive.

---

**Version: 0.0.0**  
**Built with: React + Three.js + Node.js**  
**No Electron, no bloat, just pure browser goodness!**

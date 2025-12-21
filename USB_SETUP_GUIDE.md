# MAYAK 3D - USB Setup Guide (Browser Version)

## Quick Start

Your MAYAK 3D application has been packaged for any Windows, Mac, or Linux PC.

### Running the Application

**On Windows:**
Simply double-click:
```
launch.bat
```

**On Mac/Linux:**
Open Terminal in this folder and run:
```bash
node server.js
```

The application will automatically start in your default browser.

---

## What You Need

### Requirements
- **Node.js** (free download from https://nodejs.org/)
  - Click "LTS" version
  - Run installer, click "Next" until done
  - Takes 2-3 minutes

### System Requirements
- Windows 10+, macOS 10.12+, or any Linux
- 2 GB RAM minimum
- Any modern browser (Chrome, Firefox, Safari, Edge)

---

## Setup for USB

### Files to Copy to USB

Copy these items to USB root:
```
USB_DRIVE/
├── launch.bat              ← Double-click this on Windows
├── server.js               ← Server that runs the app
├── package.json            ← Dependencies list (required)
│
├── dist/                   ← Application files (REQUIRED)
│   ├── index.html
│   ├── mayak.glb          ← 3D model
│   └── assets/
│
└── node_modules/           ← Optional, but recommended for offline use
    └── (installed by npm)
```

### Installation Steps

1. **Install Node.js** (one-time setup)
   - Download from https://nodejs.org/
   - Choose LTS version
   - Run installer and click "Next" for defaults

2. **Copy to USB**
   - Copy all files from `e:\MAYAK-3D` to your USB drive
   - Make sure `dist/` folder is included

3. **Run on Any PC**
   - Plug USB into PC
   - Double-click `launch.bat`
   - App opens in default browser
   - That's it!

---

## How to Use the App

1. **Select Music**: Click "Select Music" to pick an MP3 file
2. **Load Cassette**: Click the cassette tray to insert tape
3. **Play**: Click the Play button to start
4. **Volume**: Use slider below buttons
5. **Eject**: Click cassette tray again to eject tape
6. **Resume**: Reinsert and click Play to continue from where you stopped

---

## Features

✅ Interactive 3D cassette player  
✅ Full volume control  
✅ Tape load/eject animations  
✅ Audio playback with VFD visualization  
✅ Power on/off control  
✅ Smooth animations  

---

## Troubleshooting

### "Node.js is not installed"
- Install Node.js from https://nodejs.org/
- Restart your PC after installation
- Try again

### App won't open in browser
- Check that `dist/` folder exists
- Make sure you're in the correct folder
- Try clicking `launch.bat` again

### Audio won't play
- Check system volume is not muted
- Try a different audio file
- Check browser permissions for audio

### Slow performance
- Close other applications
- Your graphics card affects 3D rendering quality
- The app will still work, just slower

---

## For Mac/Linux Users

Instead of `launch.bat`, open Terminal and run:

```bash
# Navigate to the folder
cd /path/to/MAYAK-3D

# Start the app
node server.js
```

Then open your browser and go to: `http://localhost:3000`

---

## What This Does

- `launch.bat` - Batch file that starts the server
- `server.js` - Simple HTTP server (runs the app)
- `dist/` - Built application files
- `package.json` - List of what Node.js needs

**No Electron, no installation wizard, just simple browser-based app!**

---

Version: 0.0.0  
Built with: React, Three.js, Node.js

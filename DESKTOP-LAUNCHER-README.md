# Trading Journal - Desktop Launcher

## How to Start the App

### Option 1: Desktop Shortcut (Recommended)
- Look for **"Trading Journal.lnk"** on your Desktop
- Double-click it to start the app
- The development server will start automatically and open in your browser

### Option 2: Batch File
- Navigate to the project folder: `C:\coding\tradingjournalreactjs`
- Double-click **`start-desktop.bat`**
- The app will start automatically

### Option 3: VBS Script (Silent Startup)
- Double-click **`start-desktop.vbs`** in the project folder
- No command prompt window will appear
- The app will start silently in the background and open in your browser

### Option 4: Terminal Command
```bash
npm run dev
```
Then open http://localhost:3000 in your browser

---

## What Happens When You Start

1. **npm dev server** starts on `http://localhost:3000`
2. **Your default browser** opens automatically
3. The Trading Journal app loads in the browser
4. You can close the command prompt window (if visible) - the server will keep running

---

## To Stop the App

1. Close the browser window, or
2. Press `Ctrl+C` in the terminal where `npm run dev` is running

---

## Troubleshooting

**Port 3000 already in use?**
- The app will automatically use the next available port (e.g., 3001)
- Check the console output to see which port it's using

**App doesn't start?**
- Make sure Node.js is installed
- Run `npm install` in the project folder
- Check your internet connection (needed for initial setup)

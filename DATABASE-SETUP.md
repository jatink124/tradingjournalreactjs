# Database Setup Guide

## The Problem
You're getting a `SyntaxError: Unexpected token '<'` error. This means the API is returning HTML instead of JSON, which happens when the database connection fails.

## Quick Fix Checklist

### 1. Check if MySQL is Running
```
Windows:
- Open Task Manager (Ctrl+Shift+Esc)
- Look for "mysqld.exe" in the Processes tab
- If not there, start MySQL from Services:
  * Press Win+R, type "services.msc"
  * Find "MySQL80" (or similar version)
  * Right-click → Start

Or via terminal:
net start MySQL80
```

### 2. Verify Database Exists
Open MySQL Command Line and run:
```sql
SHOW DATABASES;
```

If `trading_journal` doesn't exist, create it:
```sql
CREATE DATABASE trading_journal;
```

### 3. Import Database Schema
The SQL files in your project root are the database schema:
- `categories_202601211546.sql`
- `checklist_rules_202601211546.sql`
- `journal_entries_202601211546.sql`

Run them in MySQL:
```bash
mysql -u root -p trading_journal < categories_202601211546.sql
mysql -u root -p trading_journal < checklist_rules_202601211546.sql
mysql -u root -p trading_journal < journal_entries_202601211546.sql
```

### 4. Update .env.local
Edit `.env.local` in your project with your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=trading_journal
```

## How to Test

### Option 1: Check Health Endpoint
After restarting the app, open:
```
http://localhost:3000/api/health
```

You should see:
```json
{
  "status": "ok",
  "message": "Database connection successful"
}
```

Or if there's an error:
```json
{
  "status": "error",
  "message": "Database connection failed",
  "details": "error details here"
}
```

### Option 2: Check Console Logs
When you run `npm run dev`, watch the terminal output. If there are database errors, they'll now show up with:
```
GET /api/journal error: [error details]
GET /api/categories error: [error details]
```

## Still Having Issues?

1. **Check if MySQL is on a different port**
   - Default is 3306, but you might have changed it
   - Run: `netstat -ano | findstr :3306` in terminal

2. **Wrong credentials**
   - Try connecting manually: `mysql -u root -p`
   - Make sure you're using the right password

3. **Database tables don't exist**
   - Run those SQL import files mentioned in step 3
   - Or contact your database administrator

4. **Still getting HTML errors?**
   - Check the browser's Network tab (F12 → Network)
   - Click on the failed API call
   - Look at the Response tab to see the actual error message

## Quick Start After Setup

Once everything is configured:
1. Make sure MySQL is running
2. Run: `npm run dev`
3. Open: http://localhost:3000
4. Login with your PIN

Done! 🎉

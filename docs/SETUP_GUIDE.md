# Smart Edu Platform - Setup Instructions

## Quick Start Guide

### Prerequisites
- XAMPP installed (for PHP and MySQL)
- MySQL running on port 3306
- PHP 8.x

### Step-by-Step Setup

#### 1. Database Setup

Run the all-in-one script to set up everything:

**Option A: Web-Based Setup (Easiest)**
1. Ensure your PHP server is running (`C:\xampp\php\php.exe -S localhost:8000`).
2. Open your browser and go to: [http://localhost:8000/setup.php](http://localhost:8000/setup.php)
3. Wait for the "SUCCESS" message.

**Option B: Using PowerShell (If Option A fails)**
```powershell
Get-Content setup_database.sql | C:\xampp\mysql\bin\mysql.exe -u root -p
```

**Option C: Using CMD**
```cmd
C:\xampp\mysql\bin\mysql.exe -u root -p < setup_database.sql
```

**Option B: Using phpMyAdmin**
1. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
2. Click on "Import" tab
3. Choose file: `setup_database.sql`
4. Click "Go"

#### 2. Start PHP Server

The server should already be running. If not:
```bash
cd c:\Users\soman\.gemini\antigravity\scratch\smart_edu_prototype
C:\xampp\php\php.exe -S localhost:8000
```

#### 3. Access the Application

Open your browser and navigate to: [http://localhost:8000](http://localhost:8000)

### Login Credentials

**Teachers:**
- Shruti Malde: `shruti.malde@skipsuniversity.edu.in` / `password123`
- Chandrashekhar Kothari: `chandrashekhar.kothari@skipsuniversity.edu.in` / `password123`
- Nandini Vyas: `nandini.vyas@skipsuniversity.edu.in` / `password123`

**Students (IMSCIT):**
- Asmi Patel: `asmi.imscit24@skipsuniversity.edu.in` / `password123`
- Ayaan Shaikh: `aayan.imscit24@skipsuniversity.edu.in` / `password123`
- Daksh Chajjer: `daksh.c.imscit24@skipsuniversity.edu.in` / `password123`

**Students (BCA):**
- Yug Somani: `yug.bca24@skipsuniversity.edu.in` / `password123`
- Aryan Prajapati: `aryan.bca24@skipsuniversity.edu.in` / `password123`

---

## New Features Overview

### 1. Teacher-Only Audio/Video Streaming

**Teacher Side:**
- Navigate to Live Classroom
- Click "Start Broadcast"
- Allow camera/microphone permissions
- Toggle mic/camera on/off during broadcast
- Students can now see and hear you
- Click "End" to stop broadcasting

**Student Side:**
- Navigate to Live Classroom (when teacher is active)
- Automatically see/hear teacher's stream
- No camera/mic access (receive-only)

**Note:** This is a demo implementation showing the UI and basic WebRTC functionality. For production use with multiple students, you'll need a signaling server (e.g., Socket.IO) for peer-to-peer connections.

### 2. Notification System

**Automatic Notifications for:**
- ✅ New assignment uploads
- ✅ Assignments due within 24 hours
- ✅ Classes starting within 15 minutes
- ✅ Overdue assignments

**Features:**
- Bell icon with unread count badge
- Toast popups for new notifications
- Dropdown panel to view all notifications
- Mark as read functionality
- Auto-refresh every 30 seconds

**To Test Notifications:**

1. **Assignment Upload Notification:**
   - Login as teacher
   - Create a new assignment
   - Login as student (different browser/incognito)
   - See notification appear within 30 seconds

2. **Due Date Notification:**
   - The seed data includes assignments with upcoming due dates
   - Students will receive notifications automatically

3. **Manual Trigger (for testing):**
   You can manually trigger notification checks via API:
   ```bash
   # Check for upcoming classes
   curl http://localhost:8000/api/notifications.php?action=check_upcoming_classes
   
   # Check for due assignments
   curl http://localhost:8000/api/notifications.php?action=check_due_assignments
   ```

### 3. SKIPS University Data

The database now includes:
- **2 Courses**: IMSCIT (5-year) and BCA (3-year)
- **9 Subjects**: PE, DBMS, MIC & AI, EI, PC, ADS, Java, OOAD, Business Stats
- **8 Faculty**: Shruti Malde, Chandrashekhar Kothari, Nandini Vyas, etc.
- **24 Students**: 16 IMSCIT + 8 BCA with roll numbers
- **Complete timetables** for both courses
- **5 Dummy assignments** with varied due dates

---

## Troubleshooting

### Database Connection Issues
- Check that MySQL is running in XAMPP
- Verify credentials in `api/db.php`
- Ensure database `smart_edu_hack` exists

### Camera/Microphone Not Working
- Check browser permissions (Chrome/Edge recommended)
- HTTPS required for WebRTC in production (localhost works for testing)
- Allow permissions when prompted

### Notifications Not Appearing
- Check browser console for errors
- Verify you're logged in (session active)
- Wait 30 seconds for polling cycle
- Check that assignments exist in the database

---

## File Structure

```
smart_edu_prototype/
├── api/
│   ├── notifications.php      (NEW - notification endpoints)
│   ├── teacher.php            (UPDATED - session management)
│   ├── student.php            (UPDATED - live session check)
│   └── ...
├── js/
│   ├── notifications.js       (Notification manager)
│   ├── student.js
│   └── teacher.js
├── classroom.html             (Interactive classroom)
├── setup_database.sql         (All-in-one database setup)
└── SETUP_GUIDE.md            (Setup instructions)
```

---

## Next Steps for Production

1. **WebRTC Signaling Server**: Implement Socket.IO or similar for real peer connections
2. **CRON Jobs**: Set up scheduled tasks for automated notification generation:
   - Check upcoming classes every 5 minutes
   - Check due assignments daily
3. **Security**: Hash passwords, implement CSRF protection, sanitize inputs
4. **Optimization**: Add caching, optimize database queries, implement CDN for assets
5. **Mobile App**: Create React Native/Flutter app for students

---

**Need Help?** Check the implementation plan or review the walkthrough document for detailed architecture information.

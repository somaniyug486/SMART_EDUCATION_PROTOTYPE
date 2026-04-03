# How to Share this Project with Your Friend 🚀

Follow these simple steps to move the entire **Smart Edu** platform to another laptop.

### Step 1: Prepare the Files
1.  Go to your project folder: `c:\Users\soman\.gemini\antigravity\scratch\smart_edu_prototype`
2.  **Right-click** on the `smart_edu_prototype` folder.
3.  Select **"Compress to ZIP file"** (or use WinRAR/7-Zip).
4.  Send this `.zip` file to your friend via Pen Drive, Google Drive, or WeTransfer.

---

### Step 2: Instructions for Your Friend
Ask your friend to follow these steps on their laptop:

#### 1. Install XAMPP
*   Download and install **XAMPP** from [apachefriends.org](https://www.apachefriends.org/).
*   Open the **XAMPP Control Panel**.
*   Click **Start** for both **Apache** and **MySQL**.

#### 2. Copy the Files
*   Extract the `smart_edu_prototype.zip` file.
*   Copy the extracted folder to their `C:\` drive or any preferred location. 

#### 3. Update Database Password (CRITICAL)
*   Most people have no password for MySQL in XAMPP.
*   Ask your friend to open `api/db.php` in Notepad.
*   Change line 9 from:
    `$pass = 'yugstudieswell';` 
    to:
    `$pass = '';`  *(Empty quotes if they have no password)*

#### 4. Setup the Database
*   Open a terminal (PowerShell or CMD) in that folder.
*   Run the PHP server:
    ```powershell
    php -S localhost:8000
    ```
*   Open the browser and go to: [http://localhost:8000/setup.php](http://localhost:8000/setup.php)
*   **Wait** until it says **"SUCCESS"**. This will automatically create all 24 students, 8 teachers, and the timetable on their laptop.

---

### Step 3: Start Learning!
Your friend can now log in at: [http://localhost:8000](http://localhost:8000)

**Demo Login:**
*   **Teacher:** `shruti.malde@skipsuniversity.edu.in` / `password123`
*   **Student:** `asmi.imscit24@skipsuniversity.edu.in` / `password123`

---

### ⚠️ Note on Uploaded Files
The `uploads/docs/` folder contains all the PDFs you uploaded. These are included in the ZIP, so your friend will see them too!

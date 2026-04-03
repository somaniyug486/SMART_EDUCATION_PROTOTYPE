/**
 * TEACHER DASHBOARD LOGIC
 * Purpose: This file controls everything the teacher sees and interacts with on their dashboard.
 * It talks to the backend (teacher.php) and updates the website's look.
 */

// 1. Language Change Listener: If the user changes the language, we reload the current view.
window.addEventListener('languageChanged', () => {
    console.log("Teacher JS: Language changed event received");
    if (window.currentView) loadView(window.currentView);
});

// 2. Initial Setup: When the webpage is fully loaded, check if the user is logged in.
document.addEventListener('DOMContentLoaded', () => {
    console.log("Teacher JS Loaded");
    checkAuth();
});

// 3. Security Check: Ask the server "Is this a real teacher?".
// If not, kick them back to the login page.
async function checkAuth() {
    try {
        const res = await fetch('../api/auth_check.php'); // Fetch is like a waiter taking an order to the kitchen (server).
        const data = await res.json();
        if (!data.logged_in || data.role !== 'teacher') {
            window.location.href = '../index.html'; // Redirect to login
            return;
        }
        const nameEl = document.getElementById('teacherName');
        const i18n = window.i18n;
        // Update the teacher's name on the screen.
        nameEl.innerText = i18n ? i18n.get(data.name) : data.name;
        nameEl.setAttribute('data-i18n', data.name);

        const lastView = localStorage.getItem('teacherLastView') || 'dashboard';
        loadView(lastView); // Once logged in, show the Dashboard or the last view.
    } catch (e) {
        console.error("Auth Fail:", e);
        window.location.href = '../index.html';
    }
}

async function doLogout() {
    await fetch('../api/logout.php');
    window.location.href = '../index.html';
}

// 4. View Switcher: This function decides which "page" (Dashboard, Attendance, etc.) to show.
// It changes the HTML inside the 'contentArea' div.
function loadView(view) {
    console.log("Loading view:", view);
    window.currentView = view;
    localStorage.setItem('teacherLastView', view);
    const content = document.getElementById('contentArea');
    // Show a loading spinner while we wait for data.
    content.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-primary"></div></div>';

    if (view === 'dashboard') renderDashboard(content);
    else if (view === 'attendance') renderAttendance(content);
    else if (view === 'materials') renderMaterials(content);
    else if (view === 'assignments') renderAssignments(content);
    else if (view === 'copilot') renderCoPilotDropdown(content);
    else if (view === 'availability') renderAvailability(content);
    else if (view === 'templates') renderTemplates(content);
    else if (view === 'classroom') {
        const i18n = window.i18n;
        // The Classroom is actually another HTML file shown inside an <iframe> (a window within a window).
        content.innerHTML = `
            <div class="card shadow-sm h-100" style="min-height: 85vh;">
                <div class="card-body p-0">
                    <iframe src="../classroom.html?embedded=true" style="width: 100%; height: 85vh; border: none; border-radius: 8px;"></iframe>
                </div>
            </div>`;
    }
}

async function renderDashboard(container) {
    console.log("Teacher JS: Rendering Dashboard");
    const timeout = setTimeout(() => {
        container.innerHTML = `<div class="alert alert-warning">Dashboard is taking longer than usual to load. Please check your database connection.</div>`;
    }, 5000);

    try {
        const res = await fetch('../api/teacher.php?action=my_schedule');
        const data = await res.json();
        clearTimeout(timeout);
        const i18n = window.i18n;
        console.log("Teacher JS: Dashboard data received", data);

        if (!data.schedule || data.schedule.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info shadow-sm">
                    <h5><i class="fas fa-calendar-times me-2"></i><span data-i18n="no_classes">${i18n ? i18n.get('no_classes') : 'No Classes Found'}</span></h5>
                    <p class="mb-0" data-i18n="contact_hod">${i18n ? i18n.get('contact_hod') : 'Contact HOD to update timetable.'}</p>
                </div>`;
            return;
        }

        let html = `<h3 data-i18n="my_schedule">${i18n ? i18n.get('my_schedule') : 'My Schedule'}</h3><div class="row">`;
        data.schedule.forEach(c => {
            const subName = i18n ? i18n.get(c.subject_name) : c.subject_name;
            const startTime = c.start_time ? c.start_time.slice(0, 5) : '??:??';
            const endTime = c.end_time ? c.end_time.slice(0, 5) : '??:??';
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card shadow-sm border-start border-4 border-primary">
                        <div class="card-body">
                            <h5 data-i18n="${c.subject_name}">${subName}</h5>
                            <p class="mb-0 text-muted">${c.day} | ${startTime} - ${endTime}</p>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (e) {
        clearTimeout(timeout);
        console.error("Teacher JS: Dashboard Render Error", e);
        container.innerHTML = `<div class="alert alert-danger">Failed to load dashboard: ${e.message}</div>`;
    }
}

// 5. Rendering Functions: These create the actual HTML text you see on screen.
// They get data from the API and "inject" it into the page.
async function renderAttendance(container) {
    try {
        const res = await fetch('../api/teacher.php?action=get_students_for_attendance');
        const data = await res.json();

        const subjRes = await fetch('../api/teacher.php?action=get_my_subjects');
        const subjData = await subjRes.json();
        const i18n = window.i18n;

        let options = subjData.subjects.map(s => {
            const name = i18n ? i18n.get(s.name) : s.name;
            return `<option value="${s.id}">${name}</option>`;
        }).join('');

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 data-i18n="mark_attendance">${i18n ? i18n.get('mark_attendance') : 'Mark Attendance'}</h3>
                    <div class="mt-2" style="width: 300px;">
                        <label class="small text-muted" data-i18n="subject">${i18n ? i18n.get('subject') : 'Subject'}:</label>
                        <select id="att_subject_id" class="form-select">${options}</select>
                    </div>
                </div>
                <span class="badge bg-primary">${data.students.length} Students</span>
            </div>
            <div class="card shadow-sm">
                <div class="card-body">
                    <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                        <table class="table table-hover align-middle">
                            <thead class="table-light sticky-top">
                                <tr>
                                    <th width="50">#</th>
                                    <th data-i18n="student_name">${i18n ? i18n.get('student_name') : 'Student Name'}</th>
                                    <th width="100" class="text-center" data-i18n="status">${i18n ? i18n.get('status') : 'Status'}</th>
                                </tr>
                            </thead>
                            <tbody id="stu_list"></tbody>
                        </table>
                    </div>
                    <button class="btn btn-primary btn-lg w-100 mt-4" onclick="saveAtt()">
                        <i class="fas fa-save me-2"></i> <span data-i18n="submit_attendance">${i18n ? i18n.get('submit_attendance') : 'Submit Attendance'}</span>
                    </button>
                </div>
            </div>
        `;

        let html = '';
        data.students.forEach((s, index) => {
            const studentTranslated = i18n ? i18n.get(s.name) : s.name;
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="fw-bold" data-i18n="${s.name}">${studentTranslated}</td>
                    <td class="text-center">
                        <div class="form-check form-switch d-flex justify-content-center">
                            <input type="checkbox" class="form-check-input att-cb" value="${s.id}" checked style="width: 2.5em; height: 1.25em; cursor: pointer;">
                        </div>
                    </td>
                </tr>`;
        });
        document.getElementById('stu_list').innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

window.saveAtt = async function () {
    const subjectId = document.getElementById('att_subject_id').value;
    const cbs = document.querySelectorAll('.att-cb');
    const att = [];
    cbs.forEach(cb => att.push({ user_id: cb.value, status: cb.checked ? 'present' : 'absent' }));

    await fetch('../api/teacher.php?action=submit_attendance', {
        method: 'POST', body: JSON.stringify({ subject_id: subjectId, attendance: att })
    });
    alert(window.i18n ? i18n.get('saved') : "Attendance Saved!");
}

async function renderAssignments(container) {
    try {
        const subjRes = await fetch('../api/teacher.php?action=get_my_subjects');
        const subjData = await subjRes.json();
        const i18n = window.i18n;
        let options = subjData.subjects.map(s => {
            const name = i18n ? i18n.get(s.name) : s.name;
            return `<option value="${s.id}">${name}</option>`;
        }).join('');

        container.innerHTML = `
            <h3 data-i18n="create_assignment">${i18n ? i18n.get('create_assignment') : 'Create Assignment'}</h3>
            <div class="card p-4 shadow-sm">
                 <div class="mb-3">
                     <label class="form-label" data-i18n="subject">${i18n ? i18n.get('subject') : 'Subject'}</label>
                     <select id="as_subject_id" class="form-select">${options}</select>
                 </div>
                 <div class="mb-3">
                     <label class="form-label" data-i18n="title">${i18n ? i18n.get('title') : 'Title'}</label>
                     <input type="text" id="atitle" class="form-control">
                 </div>
                 <div class="mb-3">
                     <label class="form-label" data-i18n="description">${i18n ? i18n.get('description') : 'Description'}</label>
                     <textarea id="adesc" class="form-control" rows="3"></textarea>
                 </div>
                 <div class="mb-3">
                     <label class="form-label" data-i18n="due_date">${i18n ? i18n.get('due_date') : 'Due Date'}</label>
                     <input type="date" id="adue" class="form-control">
                 </div>
                 <button class="btn btn-primary btn-lg w-100" onclick="postAss()">
                    <i class="fas fa-paper-plane me-2"></i> <span data-i18n="posted">${i18n ? i18n.get('posted') : 'Post Assignment'}</span>
                 </button>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

window.postAss = async function () {
    const subjectId = document.getElementById('as_subject_id').value;
    const title = document.getElementById('atitle').value;
    const desc = document.getElementById('adesc').value;
    const due = document.getElementById('adue').value;

    if (!title || !due) {
        alert("Please fill in the title and due date");
        return;
    }

    await fetch('../api/teacher.php?action=create_assignment', {
        method: 'POST', body: JSON.stringify({
            subject_id: subjectId,
            title: title,
            description: desc,
            due_date: due
        })
    });
    alert(window.i18n ? i18n.get('posted') : "Assignment Posted!");
    document.getElementById('atitle').value = '';
    document.getElementById('adesc').value = '';
    document.getElementById('adue').value = '';
}

function renderCoPilotDropdown(container) {
    const i18n = window.i18n;
    container.innerHTML = `
        <h3>${i18n ? i18n.get('copilot') : 'Teacher Co-Pilot'}</h3>
        <div class="card p-4">
            <div class="row">
                <div class="col-md-5">
                    <label><strong>1. ${i18n ? i18n.get('topic') : 'Topic'}</strong></label>
                    <input type="text" id="cp_topic" class="form-control mb-3">
                    
                    <label><strong>2. ${i18n ? i18n.get('mode') : 'Mode'}</strong></label>
                    <select id="cp_mode" class="form-select mb-3">
                        <option value="lesson">${i18n ? i18n.get('lesson_plan') : 'Lesson Plan'}</option>
                        <option value="quiz">${i18n ? i18n.get('generate_quiz') : 'Generate Quiz'}</option>
                        <option value="activity">${i18n ? i18n.get('classroom_activity') : 'Classroom Activity'}</option>
                    </select>
                    
                    <button class="btn btn-primary w-100" onclick="runAI()">${i18n ? i18n.get('generate') : 'Generate'}</button>
                </div>
                <div class="col-md-7">
                    <div id="ai_res" class="border p-3 bg-light" style="height: 300px; overflow-y: auto;">${i18n ? i18n.get('output') : 'Output...'}</div>
                </div>
            </div>
        </div>
    `;
}

window.runAI = async function () {
    const topic = document.getElementById('cp_topic').value.trim();
    const mode = document.getElementById('cp_mode').value;
    const resDiv = document.getElementById('ai_res');
    if (!topic) return;

    resDiv.innerHTML = `
        <div class="text-center mt-5">
            <div class="spinner-border text-primary mb-2"></div>
            <p class="text-muted small">AI is crafting your ${mode}...</p>
        </div>`;

    try {
        const response = await fetch('../api/ai.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `${mode.toUpperCase()} for "${topic}"`, type: 'chat' })
        });
        const data = await response.json();
        const aiText = data.answer || "Failed to generate content.";

        // Format
        const formatted = aiText
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // Markdown links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>'); // Raw links

        resDiv.innerHTML = `<div class="bg-white p-4 rounded-3 shadow-sm border ai-response-bubble">${formatted}</div>`;

    } catch (e) {
        resDiv.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

async function renderMaterials(container) {
    console.log("Teacher JS: Rendering Materials");
    const timeout = setTimeout(() => {
        container.innerHTML = `<div class="alert alert-warning">Loading materials is taking longer than usual.</div>`;
    }, 5000);

    try {
        const res = await fetch('../api/teacher.php?action=get_my_subjects');
        const data = await res.json();
        clearTimeout(timeout);
        const i18n = window.i18n;
        console.log("Teacher JS: Materials data received", data);

        if (!data.subjects || data.subjects.length === 0) {
            container.innerHTML = `<div class="alert alert-info" data-i18n="no_files">${i18n ? i18n.get('no_files') : 'No subjects found.'}</div>`;
            return;
        }

        let options = data.subjects.map(s => {
            const name = i18n ? i18n.get(s.name) : s.name;
            return `<option value="${s.id}">${name}</option>`;
        }).join('');

        container.innerHTML = `
            <h3 data-i18n="upload_materials">${i18n ? i18n.get('upload_materials') : 'Upload Materials'}</h3>
            <div class="card p-4 shadow-sm">
                <div class="mb-3">
                    <label class="form-label" data-i18n="subject">${i18n ? i18n.get('subject') : 'Subject'}</label>
                    <select id="up_subject" class="form-select">${options}</select>
                </div>
                <div class="mb-3">
                    <label class="form-label" data-i18n="title">${i18n ? i18n.get('title') : 'Title'}</label>
                    <input type="text" id="up_title" class="form-control">
                </div>
                <div class="mb-3">
                    <label class="form-label">File</label>
                    <input type="file" id="up_file" class="form-control">
                </div>
                <button class="btn btn-primary btn-lg" onclick="doUpload()" data-i18n="upload">
                    <i class="fas fa-cloud-upload-alt me-2"></i> ${i18n ? i18n.get('upload') : 'Upload'}
                </button>
                <div id="up_status" class="mt-3"></div>
            </div>
        `;
    } catch (e) {
        clearTimeout(timeout);
        console.error("Teacher JS: Materials Render Error", e);
        container.innerHTML = `<div class="alert alert-danger">Error loading materials: ${e.message}</div>`;
    }
}

window.doUpload = async function () {
    const subjectId = document.getElementById('up_subject').value;
    const title = document.getElementById('up_title').value;
    const fileInput = document.getElementById('up_file');
    const status = document.getElementById('up_status');

    if (!title || !fileInput.files[0]) return;
    status.innerHTML = '<div class="spinner-border text-primary"></div>';

    const formData = new FormData();
    formData.append('subject_id', subjectId);
    formData.append('title', title);
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch('../api/teacher.php?action=upload_material', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            status.innerHTML = `<div class="alert alert-success">${i18n ? i18n.get('uploaded') : 'Uploaded!'}</div>`;
        } else {
            status.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        }
    } catch (e) {
        status.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

async function renderAvailability(container) {
    const i18n = window.i18n;
    try {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 data-i18n="manage_availability">${i18n ? i18n.get('manage_availability') : 'Manage Availability'}</h3>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-primary" onclick="loadView('templates')">
                        <i class="fas fa-list me-2"></i> <span data-i18n="manage_templates">${i18n ? i18n.get('manage_templates') : 'Weekly Templates'}</span>
                    </button>
                    <button class="btn btn-info" onclick="showGenerateModal()">
                        <i class="fas fa-magic me-2"></i> <span data-i18n="generate_slots">${i18n ? i18n.get('generate_slots') : 'Generate from Templates'}</span>
                    </button>
                    <button class="btn btn-primary" onclick="showCreateSlotModal()">
                        <i class="fas fa-plus me-2"></i> <span data-i18n="add_slot">${i18n ? i18n.get('add_slot') : 'Add Custom Slot'}</span>
                    </button>
                </div>
            </div>
            
            <div id="availability_content">
                <div class="row" id="slots_list">
                    <div class="text-center p-5"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>

            <!-- Generate Slots Modal -->
            <div class="modal fade" id="generateModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Generate Weekly Slots</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Select Target Week (Start Sunday)</label>
                                <input type="date" id="gen_week_start" class="form-control">
                                <small class="text-muted">The system will generate slots for the 7 days starting from this date.</small>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Select Templates to Use</label>
                                <div id="gen_templates_list" class="border rounded p-2 mb-2" style="max-height: 150px; overflow-y: auto;">
                                    Loading templates...
                                </div>
                            </div>
                            <hr>
                            <div class="mb-3">
                                <label class="form-label">OR Copy from a Previous Week</label>
                                <div class="input-group mb-2">
                                    <input type="date" id="gen_prev_week_start" class="form-control" title="Select a previous Sunday">
                                    <button class="btn btn-outline-secondary" type="button" onclick="loadPastWeekSlots()">Load History</button>
                                </div>
                                <div id="gen_past_slots_list" class="border rounded p-2" style="max-height: 150px; overflow-y: auto;">
                                    <small class="text-muted">Select a previous week to see slots you created then.</small>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-info" onclick="doGenerateSlots()">Generate selected</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Create Slot Modal -->
            <div class="modal fade" id="slotModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" data-i18n="create_new_slot">${i18n ? i18n.get('create_new_slot') : 'Create New Slot'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label" data-i18n="date">${i18n ? i18n.get('date') : 'Date'}</label>
                                <input type="date" id="slot_date" class="form-control" min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label" data-i18n="start_time">${i18n ? i18n.get('start_time') : 'Start Time'}</label>
                                    <input type="time" id="slot_start" class="form-control">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label" data-i18n="end_time">${i18n ? i18n.get('end_time') : 'End Time'}</label>
                                    <input type="time" id="slot_end" class="form-control">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label" data-i18n="mode">${i18n ? i18n.get('mode') : 'Mode'}</label>
                                <select id="slot_mode" class="form-select">
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label" data-i18n="max_students">${i18n ? i18n.get('max_students') : 'Max Students'}</label>
                                <input type="number" id="slot_max" class="form-control" value="1" min="1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-i18n="cancel">${i18n ? i18n.get('cancel') : 'Cancel'}</button>
                            <button type="button" class="btn btn-primary" onclick="saveSlot()" data-i18n="save">${i18n ? i18n.get('save') : 'Save'}</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bookings Modal -->
            <div class="modal fade" id="bookingsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" data-i18n="slot_bookings">${i18n ? i18n.get('slot_bookings') : 'Slot Bookings'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="bookings_list">
                            <!-- Injected -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        loadSlots();

    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

async function renderTemplates(container) {
    const i18n = window.i18n;
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <button class="btn btn-sm btn-outline-secondary mb-2" onclick="loadView('availability')">
                    <i class="fas fa-arrow-left me-1"></i> Back to Slots
                </button>
                <h3 data-i18n="manage_templates">${i18n ? i18n.get('manage_templates') : 'Weekly Availability Templates'}</h3>
            </div>
            <button class="btn btn-primary" onclick="showTemplateModal()">
                <i class="fas fa-plus me-2"></i> Add Template
            </button>
        </div>

        <div class="card shadow-sm">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Day</th>
                                <th>Time</th>
                                <th>Mode</th>
                                <th>Max Students</th>
                                <th>Label</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="templates_list">
                            <tr><td colspan="6" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Template Modal -->
        <div class="modal fade" id="templateModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <form id="templateForm" onsubmit="saveTemplate(event)">
                        <input type="hidden" id="tmpl_id">
                        <div class="modal-header">
                            <h5 class="modal-title">Availability Template</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Day of Week</label>
                                <select id="tmpl_day" class="form-select" required>
                                    <option value="0">Sunday</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                </select>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Start Time</label>
                                    <input type="time" id="tmpl_start" class="form-control" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">End Time</label>
                                    <input type="time" id="tmpl_end" class="form-control" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Mode</label>
                                <select id="tmpl_mode" class="form-select">
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Max Students</label>
                                <input type="number" id="tmpl_max" class="form-control" value="1" min="1">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Label (Optional)</label>
                                <input type="text" id="tmpl_label" class="form-control" placeholder="e.g. Weekly Doubt Hour">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Template</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    loadTemplates();
}

window.showTemplateModal = function (data = null) {
    document.getElementById('templateForm').reset();
    document.getElementById('tmpl_id').value = '';

    if (data) {
        document.getElementById('tmpl_id').value = data.id;
        document.getElementById('tmpl_day').value = data.day_of_week;
        document.getElementById('tmpl_start').value = data.start_time.slice(0, 5);
        document.getElementById('tmpl_end').value = data.end_time.slice(0, 5);
        document.getElementById('tmpl_mode').value = data.mode;
        document.getElementById('tmpl_max').value = data.max_students;
        document.getElementById('tmpl_label').value = data.label || '';
    }

    new bootstrap.Modal(document.getElementById('templateModal')).show();
}

async function loadTemplates() {
    const res = await fetch('../api/teacher.php?action=get_templates');
    const data = await res.json();
    const list = document.getElementById('templates_list');
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (!data.templates || data.templates.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="text-center p-4 text-muted">No templates defined.</td></tr>';
        return;
    }

    list.innerHTML = data.templates.map(t => `
        <tr>
            <td>${days[t.day_of_week]}</td>
            <td>${t.start_time.slice(0, 5)} - ${t.end_time.slice(0, 5)}</td>
            <td><span class="badge ${t.mode === 'online' ? 'bg-info' : 'bg-warning'} text-dark">${t.mode}</span></td>
            <td>${t.max_students}</td>
            <td>${t.label || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick='showTemplateModal(${JSON.stringify(t)})'><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTemplate(${t.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.saveTemplate = async function (e) {
    e.preventDefault();
    const payload = {
        id: document.getElementById('tmpl_id').value,
        day_of_week: document.getElementById('tmpl_day').value,
        start_time: document.getElementById('tmpl_start').value,
        end_time: document.getElementById('tmpl_end').value,
        mode: document.getElementById('tmpl_mode').value,
        max_students: document.getElementById('tmpl_max').value,
        label: document.getElementById('tmpl_label').value
    };

    const res = await fetch('../api/teacher.php?action=save_template', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('templateModal')).hide();
        loadTemplates();
    }
}

window.deleteTemplate = async function (id) {
    if (!confirm("Delete this template? Future weekly generations will not include it.")) return;
    await fetch('../api/teacher.php?action=delete_template', {
        method: 'POST',
        body: JSON.stringify({ id })
    });
    loadTemplates();
}

window.showGenerateModal = async function () {
    // Default to next Sunday
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + (7 - today.getDay()));
    document.getElementById('gen_week_start').value = nextSunday.toISOString().split('T')[0];

    // Default previous week (last Sunday)
    const prevSunday = new Date(nextSunday);
    prevSunday.setDate(nextSunday.getDate() - 7);
    document.getElementById('gen_prev_week_start').value = prevSunday.toISOString().split('T')[0];

    const res = await fetch('../api/teacher.php?action=get_templates');
    const data = await res.json();
    const list = document.getElementById('gen_templates_list');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (!data.templates || data.templates.length === 0) {
        list.innerHTML = '<p class="text-center p-2 small text-muted">No templates defined.</p>';
    } else {
        list.innerHTML = data.templates.map(t => `
            <div class="form-check mb-2">
                <input class="form-check-input tmpl-chk" type="checkbox" value="${t.id}" id="chk_${t.id}">
                <label class="form-check-label small" for="chk_${t.id}">
                    <strong>${days[t.day_of_week]}</strong>: ${t.start_time.slice(0, 5)} (${t.label || t.mode})
                </label>
            </div>
        `).join('');
    }

    document.getElementById('gen_past_slots_list').innerHTML = '<small class="text-muted">Click "Load History" to see previous slots.</small>';
    new bootstrap.Modal(document.getElementById('generateModal')).show();
}

window.loadPastWeekSlots = async function () {
    const weekStart = document.getElementById('gen_prev_week_start').value;
    const container = document.getElementById('gen_past_slots_list');
    container.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div></div>';

    try {
        const res = await fetch(`../api/teacher.php?action=get_past_slots&week_start_date=${weekStart}`);
        const data = await res.json();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        if (!data.slots || data.slots.length === 0) {
            container.innerHTML = '<p class="text-center p-2 small text-muted">No slots found for this week.</p>';
            return;
        }

        container.innerHTML = data.slots.map(s => `
            <div class="form-check mb-2">
                <input class="form-check-input hist-chk" type="checkbox" 
                    data-day="${s.day_of_week}" 
                    data-start="${s.start_time}" 
                    data-end="${s.end_time}" 
                    data-mode="${s.mode}" 
                    data-max="${s.max_students}" 
                    id="hist_${s.id}" checked>
                <label class="form-check-label small" for="hist_${s.id}">
                    <strong>${days[s.day_of_week]}</strong>: ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)} (${s.mode})
                </label>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p class="text-danger small">Error loading history.</p>';
    }
}

window.doGenerateSlots = async function () {
    const weekStart = document.getElementById('gen_week_start').value;

    // Templates
    const tmplChks = document.querySelectorAll('.tmpl-chk:checked');
    const tmplIds = Array.from(tmplChks).map(c => c.value);

    // Ad-hoc history slots
    const histChks = document.querySelectorAll('.hist-chk:checked');
    const adHocSlots = Array.from(histChks).map(c => ({
        day_of_week: c.dataset.day,
        start_time: c.dataset.start,
        end_time: c.dataset.end,
        mode: c.dataset.mode,
        max_students: c.dataset.max
    }));

    if (!weekStart || (tmplIds.length === 0 && adHocSlots.length === 0)) {
        alert("Please select a target week and at least one template or historical slot.");
        return;
    }

    const res = await fetch('../api/teacher.php?action=generate_slots_from_templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            week_start_date: weekStart,
            template_ids: tmplIds,
            ad_hoc_slots: adHocSlots
        })
    });
    const data = await res.json();
    if (data.success) {
        alert(`Successfully generated ${data.generated_count} slots!`);
        bootstrap.Modal.getInstance(document.getElementById('generateModal')).hide();
        loadSlots();
    } else {
        alert(data.message || "Failed to generate slots.");
    }
}

async function renderAvailability(container) {
    const i18n = window.i18n;
    try {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 data-i18n="manage_availability">${i18n ? i18n.get('manage_availability') : 'Manage Availability'}</h3>
                <button class="btn btn-primary" onclick="showCreateSlotModal()">
                    <i class="fas fa-plus me-2"></i> <span data-i18n="add_slot">${i18n ? i18n.get('add_slot') : 'Add Slot'}</span>
                </button>
            </div>
            
            <div id="availability_content">
                <div class="row" id="slots_list">
                    <div class="text-center p-5"><div class="spinner-border text-primary"></div></div>
                </div>
            </div>

            <!-- Create Slot Modal -->
            <div class="modal fade" id="slotModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" data-i18n="create_new_slot">${i18n ? i18n.get('create_new_slot') : 'Create New Slot'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label" data-i18n="date">${i18n ? i18n.get('date') : 'Date'}</label>
                                <input type="date" id="slot_date" class="form-control" min="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label" data-i18n="start_time">${i18n ? i18n.get('start_time') : 'Start Time'}</label>
                                    <input type="time" id="slot_start" class="form-control">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label" data-i18n="end_time">${i18n ? i18n.get('end_time') : 'End Time'}</label>
                                    <input type="time" id="slot_end" class="form-control">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label" data-i18n="mode">${i18n ? i18n.get('mode') : 'Mode'}</label>
                                <select id="slot_mode" class="form-select">
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label" data-i18n="max_students">${i18n ? i18n.get('max_students') : 'Max Students'}</label>
                                <input type="number" id="slot_max" class="form-control" value="1" min="1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-i18n="cancel">${i18n ? i18n.get('cancel') : 'Cancel'}</button>
                            <button type="button" class="btn btn-primary" onclick="saveSlot()" data-i18n="save">${i18n ? i18n.get('save') : 'Save'}</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bookings Modal -->
            <div class="modal fade" id="bookingsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" data-i18n="slot_bookings">${i18n ? i18n.get('slot_bookings') : 'Slot Bookings'}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="bookings_list">
                            <!-- Injected -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        loadSlots();

    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
}

window.showCreateSlotModal = function () {
    const modal = new bootstrap.Modal(document.getElementById('slotModal'));
    modal.show();
}

async function loadSlots() {
    const i18n = window.i18n;
    const res = await fetch('../api/teacher.php?action=get_my_slots');
    const data = await res.json();
    const list = document.getElementById('slots_list');

    if (!data.slots || data.slots.length === 0) {
        list.innerHTML = `<div class="col-12 text-center p-5 text-muted"><p data-i18n="no_slots">${i18n ? i18n.get('no_slots') : 'No availability slots defined yet.'}</p></div>`;
        return;
    }

    let html = '';
    data.slots.forEach(s => {
        const isClosed = s.status === 'closed';
        const hasBookings = s.current_bookings > 0;

        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card shadow-sm h-100 ${isClosed ? 'opacity-75 bg-light' : ''}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span class="badge ${s.mode === 'online' ? 'bg-info' : 'bg-warning'} text-dark">${s.mode.toUpperCase()}</span>
                        <span class="badge ${isClosed ? 'bg-secondary' : 'bg-success'}">${isClosed ? 'Closed' : 'Open'}</span>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title mb-1">${s.date}</h5>
                        <p class="text-primary fw-bold mb-3">${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}</p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <small class="text-muted"><i class="fas fa-users me-1"></i> ${s.current_bookings} / ${s.max_students} students</small>
                            ${hasBookings ? `<button class="btn btn-sm btn-outline-primary" onclick="viewBookings(${s.id})">View Bookings</button>` : ''}
                        </div>
                    </div>
                    <div class="card-footer bg-transparent border-0 d-flex gap-2">
                        ${!isClosed ? `
                            <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="${hasBookings ? `closeSlot(${s.id})` : `deleteSlot(${s.id})`}">
                                <i class="fas ${hasBookings ? 'fa-lock' : 'fa-trash'} me-1"></i> ${hasBookings ? 'Close Slot' : 'Delete'}
                            </button>
                        ` : '<small class="text-muted w-100 text-center">Slot Closed</small>'}
                    </div>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

window.saveSlot = async function () {
    const date = document.getElementById('slot_date').value;
    const start = document.getElementById('slot_start').value;
    const end = document.getElementById('slot_end').value;
    const mode = document.getElementById('slot_mode').value;
    const max = document.getElementById('slot_max').value;

    if (!date || !start || !end) {
        alert("Please fill all fields");
        return;
    }

    const res = await fetch('../api/teacher.php?action=create_slot', {
        method: 'POST',
        body: JSON.stringify({ date, start_time: start, end_time: end, mode, max_students: max })
    });
    const data = await res.json();
    if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('slotModal')).hide();
        loadSlots();
    } else {
        alert(data.message || "Failed to create slot");
    }
}

window.deleteSlot = async function (id) {
    if (!confirm("Are you sure you want to delete this slot?")) return;
    const res = await fetch('../api/teacher.php?action=delete_slot', {
        method: 'POST',
        body: JSON.stringify({ slot_id: id })
    });
    const data = await res.json();
    if (data.success) loadSlots();
    else alert(data.message);
}

window.closeSlot = async function (id) {
    if (!confirm("This slot has bookings. Closing it will prevent further bookings. Continue?")) return;
    const res = await fetch('../api/teacher.php?action=close_slot', {
        method: 'POST',
        body: JSON.stringify({ slot_id: id })
    });
    const data = await res.json();
    if (data.success) loadSlots();
}

window.viewBookings = async function (slotId) {
    const res = await fetch(`../api/teacher.php?action=get_slot_bookings&slot_id=${slotId}`);
    const data = await res.json();
    const container = document.getElementById('bookings_list');
    const i18n = window.i18n;

    if (!data.bookings || data.bookings.length === 0) {
        container.innerHTML = '<p class="text-center p-3">No bookings for this slot yet.</p>';
    } else {
        let html = '<div class="list-group">';
        data.bookings.forEach(b => {
            const isPending = b.status === 'pending';
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${b.student_name} <small class="text-muted">(${b.subject_name})</small></h6>
                        <span class="badge ${b.status === 'accepted' ? 'bg-success' : (b.status === 'rejected' ? 'bg-danger' : 'bg-warning')}">${b.status.toUpperCase()}</span>
                    </div>
                    <p class="mb-1"><strong>Topic:</strong> ${b.topic}</p>
                    <p class="mb-2 small text-muted">${b.description}</p>
                    ${isPending ? `
                        <div class="mt-3">
                            <textarea id="note_${b.id}" class="form-control form-control-sm mb-2" placeholder="Acceptance message or Rejection reason..."></textarea>
                            <div class="d-flex gap-2">
                                <button class="btn btn-sm btn-success flex-grow-1" onclick="handleBooking(${b.id}, 'accepted')">Accept</button>
                                <button class="btn btn-sm btn-danger flex-grow-1" onclick="handleBooking(${b.id}, 'rejected')">Reject</button>
                            </div>
                        </div>
                    ` : (b.status === 'accepted' ? `<small class="text-success"><strong>Notes:</strong> ${b.teacher_notes || 'None'}</small>` : `<small class="text-danger"><strong>Reason:</strong> ${b.rejection_reason}</small>`)}
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    const modal = new bootstrap.Modal(document.getElementById('bookingsModal'));
    modal.show();
}

window.handleBooking = async function (bookingId, status) {
    const notes = document.getElementById(`note_${bookingId}`).value;
    if (status === 'rejected' && !notes) {
        alert("A reason is mandatory for rejection.");
        return;
    }

    const res = await fetch('../api/teacher.php?action=respond_to_booking', {
        method: 'POST',
        body: JSON.stringify({ booking_id: bookingId, status, notes })
    });
    const data = await res.json();
    if (data.success) {
        alert("Booking status updated!");
        bootstrap.Modal.getInstance(document.getElementById('bookingsModal')).hide();
        loadSlots(); // Refresh slot counts
    } else {
        alert(data.message || "Failed to update booking");
    }
}

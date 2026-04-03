/**
 * STUDENT DASHBOARD LOGIC
 * Purpose: This file manages the student's website experience.
 * It handles viewing classes, booking doubts, and chatting with the AI Tutor.
 */

// 1. Language Refresh: When the user switches language, we redraw the current screen.
window.addEventListener('languageChanged', () => {
    console.log("Student JS: Language changed event received");
    const title = document.getElementById('pageTitle');
    if (!title) return;
    const currentView = title.getAttribute('data-view');
    if (currentView) loadView(currentView);
});

// 2. Startup: Wait for the browser to finish loading, then check identity.
document.addEventListener('DOMContentLoaded', () => {
    console.log("Student JS Loaded");
    checkAuth();
});

// 3. Security: Check if this user is a student. Redirect if not.
async function checkAuth() {
    try {
        const res = await fetch('../api/auth_check.php');
        const data = await res.json();
        if (!data.logged_in || data.role !== 'student') {
            window.location.href = '../index.html';
            return;
        }
        const nameEl = document.getElementById('studentName');
        const i18n = window.i18n;
        nameEl.innerText = i18n ? i18n.get(data.name) : data.name;
        nameEl.setAttribute('data-i18n', data.name);

        const lastView = localStorage.getItem('studentLastView') || 'dashboard';
        loadView(lastView); // Start by showing the home dashboard or the last view.
    } catch (e) {
        console.error("Auth Fail:", e);
        window.location.href = '../index.html';
    }
}

async function doLogout() {
    await fetch('../api/logout.php');
    window.location.href = '../index.html';
}

function loadView(view) {
    console.log("Loading view:", view);
    const content = document.getElementById('contentArea');
    const title = document.getElementById('pageTitle');

    // Store current view identifier for language refresh and reloads
    title.setAttribute('data-view', view);
    localStorage.setItem('studentLastView', view);

    // Clear & Show Spinner
    content.innerHTML = `<div class="text-center mt-5"><div class="spinner-border text-primary"></div></div>`;

    const i18n = window.i18n;

    if (view === 'dashboard') {
        title.innerText = i18n ? i18n.get('my_dashboard') : "My Dashboard";
        title.setAttribute('data-i18n', 'my_dashboard');
        renderDashboard(content);
    } else if (view === 'courses') {
        title.innerText = i18n ? i18n.get('my_courses') : "My Courses";
        title.setAttribute('data-i18n', 'my_courses');
        renderCourses(content);
    } else if (view === 'assignments') {
        title.innerText = i18n ? i18n.get('my_assignments') : "My Assignments";
        title.setAttribute('data-i18n', 'my_assignments');
        renderAssignments(content);
    } else if (view === 'attendance') {
        title.innerText = i18n ? i18n.get('attendance_log') : "Attendance Log";
        title.setAttribute('data-i18n', 'attendance_log');
        renderAttendance(content);
    } else if (view === 'ai_assistant') {
        title.innerText = i18n ? i18n.get('ai_tutor') : "AI Tutor";
        title.setAttribute('data-i18n', 'ai_tutor');
        renderAI(content);
    } else if (view === 'bookings') {
        title.innerText = i18n ? i18n.get('doubts_sessions') : "Doubt Sessions";
        title.setAttribute('data-i18n', 'doubts_sessions');
        renderBookings(content);
    }
}

// === RENDERERS ===

/**
 * DASHBOARD RENDERER
 * Purpose: Fetches and displays "Today's Schedule" and any "LIVE" classes.
 */
async function renderDashboard(container) {
    try {
        const res = await fetch('../api/student.php?action=dashboard_stats');
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned ${res.status}`);
        }
        const data = await res.json();
        const i18n = window.i18n;

        let html = '';

        // 1. Render LIVE SESSIONS FIRST
        if (data.live_sessions && data.live_sessions.length > 0) {
            html += `<h5 class="text-danger mb-3"><i class="fas fa-circle-play fa-beat me-2"></i> <span data-i18n="live_now">${i18n ? i18n.get('live_now') : 'LIVE NOW'}</span></h5><div class="row mb-4">`;
            data.live_sessions.forEach(ls => {
                const subject = i18n ? i18n.get(ls.subject_name) : ls.subject_name;
                const joinBtn = i18n ? i18n.get('join_class') : "Join Class";

                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card border-danger shadow-sm h-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <h5 data-i18n="${ls.subject_name}">${subject}</h5>
                                    <span class="badge bg-danger">LIVE</span>
                                </div>
                                <p class="text-muted small">${ls.teacher_name}</p>
                                <button class="btn btn-danger w-100 mt-2" onclick="window.open('../classroom.html?subject_id=${ls.subject_id}','_blank','width=1200,height=800')">
                                    <i class="fas fa-video me-2"></i> <span data-i18n="join_class">${joinBtn}</span>
                                </button>
                            </div>
                        </div>
                    </div>`;
            });
            html += '</div>';
        }

        if ((!data.classes || data.classes.length === 0) && (!data.live_sessions || data.live_sessions.length === 0)) {
            container.innerHTML = html + `<div class="alert alert-info" data-i18n="no_classes">${i18n ? i18n.get('no_classes') : 'No classes scheduled.'}</div>`;
            return;
        }

        if (data.classes && data.classes.length > 0) {
            html += `<h5 data-i18n="todays_schedule">${i18n ? i18n.get('todays_schedule') : "Today's Schedule"}</h5><div class="row">`;
            data.classes.forEach(c => {
                const subject = i18n ? i18n.get(c.subject_name) : c.subject_name;
                const joinBtn = i18n ? i18n.get('join_class') : "Join Class";

                html += `
                    <div class="col-md-6 mb-3">
                        <div class="card border-primary h-100">
                            <div class="card-body">
                                <h5 data-i18n="${c.subject_name}">${subject}</h5>
                                <p>${c.start_time} - ${c.end_time}</p>
                                <button class="btn btn-primary" onclick="window.open('../classroom.html?subject_id=${c.subject_id}','_blank','width=1200,height=800')" data-i18n="join_class">${joinBtn}</button>
                            </div>
                        </div>
                    </div>`;
            });
            html += '</div>';
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger"><b>Dashboard Load Error:</b> ${e.message}</div>`;
        console.error("Dashboard Render Error:", e);
    }
}

async function renderCourses(container) {
    try {
        const res = await fetch('../api/student.php?action=courses');
        const data = await res.json();
        const i18n = window.i18n;

        if (!data.courses || data.courses.length === 0) {
            container.innerHTML = `<div class="alert alert-warning">No courses.</div>`;
            return;
        }

        let html = `<div class="accordion" id="accCourses">`;
        data.courses.forEach((c, i) => {
            const courseName = i18n ? i18n.get(c.name) : c.name;
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#c${i}" data-i18n="${c.name}">${courseName}</button></h2>
                    <div id="c${i}" class="accordion-collapse collapse" data-bs-parent="#accCourses">
                        <div class="accordion-body">
                            <ul class="list-group">
                                ${c.subjects.map(s => {
                const subName = i18n ? i18n.get(s.name) : s.name;
                const filesBtn = i18n ? i18n.get('files') : "Files";
                return `<li class="list-group-item d-flex justify-content-between"><span data-i18n="${s.name}">${subName}</span> 
                                     <button class="btn btn-sm btn-outline-primary" onclick="loadDocs(${s.id})" data-i18n="files">${filesBtn}</button></li>`;
            }).join('')}
                            </ul>
                        </div>
                    </div>
                </div>`;
        });
        html += `</div><div id="docArea" class="mt-4"></div>`;
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div class="alert alert-danger">${i18n ? i18n.get('error') : 'Error'}: ${e.message}</div>`; }
}

window.loadDocs = async function (sid) {
    const area = document.getElementById('docArea');
    const i18n = window.i18n;
    area.innerHTML = i18n ? i18n.get('loading') : 'Loading...';
    try {
        const res = await fetch(`../api/student.php?action=get_materials&subject_id=${sid}`);
        const data = await res.json();
        if (!data.files || data.files.length === 0) { area.innerHTML = `<div class="alert alert-secondary">${i18n ? i18n.get('no_files') : 'No files.'}</div>`; return; }

        let html = `<h6>${i18n ? i18n.get('materials') : 'Materials'}:</h6><ul class="list-group">`;
        data.files.forEach(f => {
            html += `<li class="list-group-item"><a href="../uploads/docs/${f.filename}" download>${f.title} <i class="fas fa-download"></i></a></li>`;
        });
        html += '</ul>';
        area.innerHTML = html;
    } catch (e) { area.innerHTML = "Failed to load files."; }
}

async function renderAssignments(container) {
    try {
        const res = await fetch('../api/student.php?action=assignments');
        const data = await res.json();
        const i18n = window.i18n;

        if (!data.assignments || data.assignments.length === 0) {
            container.innerHTML = `<div class="alert alert-success">${i18n ? i18n.get('no_assignments') : 'No assignments!'}</div>`;
            return;
        }

        let html = `<div class="list-group">`;
        data.assignments.forEach(a => {
            const subName = i18n ? i18n.get(a.subject_name) : a.subject_name;
            const dueLabel = i18n ? i18n.get('due') : "Due";
            const title = i18n ? i18n.get(a.title) : a.title;
            const desc = i18n ? i18n.get(a.description) : a.description;

            html += `
                <a href="#" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1" data-i18n="${a.title}">${title}</h5>
                        <small class="text-danger"><span data-i18n="due">${dueLabel}</span>: ${a.due_date}</small>
                    </div>
                    <p class="mb-1" data-i18n="${a.description}">${desc}</p>
                    <small class="text-muted" data-i18n="${a.subject_name}">${subName}</small>
                </a>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div class="alert alert-danger">${i18n ? i18n.get('error') : 'Error'}: ${e.message}</div>`; }
}

async function renderAttendance(container) {
    try {
        const res = await fetch('../api/student.php?action=attendance_log');
        const data = await res.json();
        const i18n = window.i18n;

        if (!data.log || data.log.length === 0) {
            container.innerHTML = `<div class="alert alert-info" data-i18n="no_attendance_records">${i18n ? i18n.get('no_attendance_records') : 'No attendance records found yet.'}</div>`;
            return;
        }

        let html = `<table class="table table-hover"><thead><tr>
            <th data-i18n="date">${i18n ? i18n.get('date') : 'Date'}</th>
            <th data-i18n="subject">${i18n ? i18n.get('subject') : 'Subject'}</th>
            <th data-i18n="status">${i18n ? i18n.get('status') : 'Status'}</th>
        </tr></thead><tbody>`;
        data.log.forEach(r => {
            const cls = r.status === 'present' ? 'text-success' : 'text-danger';
            const statusTxt = i18n ? i18n.get(r.status) : r.status.toUpperCase();
            const subName = i18n ? i18n.get(r.subject_name) : r.subject_name;

            html += `<tr><td>${r.date}</td><td data-i18n="${r.subject_name}">${subName}</td><td class="fw-bold ${cls}" data-i18n="${r.status}">${statusTxt}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

/**
 * AI TUTOR INTERFACE
 * Purpose: Creates the chat window where students can ask questions.
 */
function renderAI(container) {
    const i18n = window.i18n;
    const title = i18n ? i18n.get('ai_tutor') : 'AI Tutor';
    const placeholder = i18n ? i18n.get('ask_anything') : 'Ask me anything...';
    const askBtn = i18n ? i18n.get('ask') : 'Ask';

    container.innerHTML = `
        <div class="card shadow-sm" style="height: 600px">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                <span><i class="fas fa-robot me-2"></i>${title}</span>
                <span class="badge bg-success">Online</span>
            </div>
            <div id="chatBox" class="card-body overflow-auto bg-light p-4" style="scroll-behavior: smooth;">
                <div class="text-center text-muted mt-5">
                    <i class="fas fa-comment-dots fa-3x mb-3 opacity-25"></i>
                    <p>Hello! Ask me about your schedule, assignments, or any subject.</p>
                </div>
            </div>
            <div class="card-footer bg-white p-3">
                <div class="input-group">
                    <input type="text" id="aiInp" class="form-control" placeholder="Ask about schedule, assignments, etc..." onkeyup="if(event.key==='Enter') { askAI(); }">
                    <button class="btn btn-primary px-4" onclick="askAI()">
                        <i class="fas fa-paper-plane me-1"></i>${askBtn}
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.askAI = async function () {
    const inp = document.getElementById('aiInp');
    const box = document.getElementById('chatBox');
    const txt = inp.value.trim();
    if (!txt) return;

    // Clear placeholder
    if (box.querySelector('.text-center')) box.innerHTML = '';

    // Create a container for this Q&A thread
    const threadId = 'thread-' + Date.now();
    const threadHtml = `
        <div class="chat-thread-container mb-4" id="${threadId}">
            <div class="chat-link-line"></div>
            <!-- User Message -->
            <div class="text-end mb-3">
                <div class="d-inline-block p-3 bg-primary text-white rounded-3 shadow-sm" style="max-width: 80%; position: relative; z-index: 2;">
                    ${txt}
                </div>
                <div class="small text-muted mt-1">You</div>
            </div>
            <!-- AI Response Placeholder -->
            <div id="${threadId}-res" class="text-start">
                <div class="typing-indicator d-inline-block p-3 border bg-white rounded-3 shadow-sm text-muted">
                    <span class="spinner-grow spinner-grow-sm me-1"></span> Thinking...
                </div>
            </div>
        </div>
    `;

    box.insertAdjacentHTML('beforeend', threadHtml);
    inp.value = '';
    box.scrollTop = box.scrollHeight;

    try {
        // CALL OUR RAG API
        const response = await fetch('../api/ai.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: txt, type: 'chat' })
        });
        const data = await response.json();
        const aiText = data.answer || "I'm sorry, I couldn't process that.";

        // Format: Bold, Links, Newlines
        const formatted = aiText
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // Markdown links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>'); // Raw links

        const resDiv = document.getElementById(`${threadId}-res`);
        resDiv.innerHTML = `
            <div class="d-inline-block p-3 border bg-white rounded-3 shadow-sm text-dark ai-response-bubble" style="max-width: 85%; position: relative; z-index: 2;">
                ${formatted}
            </div>
            <div class="small text-muted mt-1">AI Tutor</div>
        `;
    } catch (e) {
        document.getElementById(`${threadId}-res`).innerHTML = `<div class="alert alert-danger py-2 px-3 small">Error: ${e.message}</div>`;
    }
    box.scrollTop = box.scrollHeight;
}

async function renderBookings(container) {
    const i18n = window.i18n;
    container.innerHTML = `
        <div class="row">
            <div class="col-lg-4">
                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-primary text-white">
                        <i class="fas fa-user-tie me-2"></i> <span data-i18n="select_teacher">${i18n ? i18n.get('select_teacher') : 'Select Teacher'}</span>
                    </div>
                    <div class="card-body">
                        <div id="teachers_list" class="list-group list-group-flush">
                            <div class="text-center p-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-8">
                <div id="availability_section" class="card shadow-sm mb-4 d-none">
                    <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                        <span><i class="fas fa-clock me-2"></i> <span data-i18n="available_slots">${i18n ? i18n.get('available_slots') : 'Available Slots'}</span></span>
                        <span id="selected_teacher_name" class="badge bg-white text-success"></span>
                    </div>
                    <div class="card-body">
                        <div id="slots_area" class="row">
                            <!-- Slots injected here -->
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm">
                    <div class="card-header bg-dark text-white">
                        <i class="fas fa-history me-2"></i> <span data-i18n="my_bookings">${i18n ? i18n.get('my_bookings') : 'My Bookings'}</span>
                    </div>
                    <div class="card-body p-0">
                        <div id="my_bookings_list" class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Teacher</th>
                                        <th>Subject/Topic</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="bookings_table_body">
                                    <tr><td colspan="4" class="text-center p-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Booking Modal -->
        <div class="modal fade" id="bookingModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" data-i18n="confirm_booking">${i18n ? i18n.get('confirm_booking') : 'Confirm Booking'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="book_slot_id">
                        <input type="hidden" id="book_subject_id">
                        <div class="mb-3">
                            <label class="form-label" data-i18n="topic">${i18n ? i18n.get('topic') : 'Topic'}</label>
                            <input type="text" id="book_topic" class="form-control" placeholder="e.g. Database Normalization">
                        </div>
                        <div class="mb-3">
                            <label class="form-label" data-i18n="short_description">${i18n ? i18n.get('short_description') : 'Short Description (min 20 chars)'}</label>
                            <textarea id="book_desc" class="form-control" rows="3"></textarea>
                            <small id="char_count" class="text-muted">0 / 20 characters</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-i18n="cancel">${i18n ? i18n.get('cancel') : 'Cancel'}</button>
                        <button type="button" class="btn btn-primary" onclick="submitBooking()" data-i18n="book_now">${i18n ? i18n.get('book_now') : 'Book Now'}</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadTeachers();
    loadMyBookings();

    // Add character count listener
    setTimeout(() => {
        const descArea = document.getElementById('book_desc');
        if (descArea) {
            descArea.addEventListener('input', (e) => {
                const count = e.target.value.length;
                const el = document.getElementById('char_count');
                el.innerText = `${count} / 20 characters`;
                el.className = count >= 20 ? 'text-success' : 'text-muted';
            });
        }
    }, 500);
}

async function loadTeachers() {
    const i18n = window.i18n;
    const res = await fetch('../api/student.php?action=get_teachers');
    const data = await res.json();
    const list = document.getElementById('teachers_list');

    if (!data.teachers || data.teachers.length === 0) {
        list.innerHTML = `<p class="text-center p-3 text-muted">No teachers assigned.</p>`;
        return;
    }

    let html = '';
    data.teachers.forEach(t => {
        html += `
            <button class="list-group-item list-group-item-action py-3 d-flex justify-content-between align-items-center" onclick="selectTeacher(${t.id}, '${t.name}', ${t.subject_id})">
                <div>
                    <strong class="d-block">${t.name}</strong>
                    <small class="text-muted">${t.subject_name}</small>
                </div>
                <i class="fas fa-chevron-right text-muted"></i>
            </button>
        `;
    });
    list.innerHTML = html;
}

window.selectTeacher = async function (id, name, subjectId) {
    try {
        document.getElementById('selected_teacher_name').innerText = name;
        document.getElementById('availability_section').classList.remove('d-none');

        const slotsArea = document.getElementById('slots_area');
        slotsArea.innerHTML = '<div class="text-center p-4 w-100"><div class="spinner-border text-success"></div></div>';

        const res = await fetch(`../api/student.php?action=get_availability&teacher_id=${id}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        if (!data.slots || data.slots.length === 0) {
            slotsArea.innerHTML = '<div class="col-12 text-center p-4 text-muted">No available slots for this teacher.</div>';
            return;
        }

        let html = '';
        data.slots.forEach(s => {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card h-100 border-success">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="mb-0 text-success">${s.date}</h6>
                                <span class="badge ${s.mode === 'online' ? 'bg-info' : 'bg-warning'} text-dark">${s.mode.toUpperCase()}</span>
                            </div>
                            <p class="small fw-bold mb-2">${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}</p>
                            <button class="btn btn-sm btn-success w-100" onclick="showBookingModal(${s.id}, ${subjectId})">Book Slot</button>
                        </div>
                    </div>
                </div>
            `;
        });
        slotsArea.innerHTML = html;
    } catch (e) {
        console.error("Select Teacher Error:", e);
        const slotsArea = document.getElementById('slots_area');
        if (slotsArea) slotsArea.innerHTML = `<div class="col-12 text-center p-4 text-danger">Error loading slots: ${e.message}</div>`;
    }
}

window.showBookingModal = function (slotId, subjectId) {
    document.getElementById('book_slot_id').value = slotId;
    document.getElementById('book_subject_id').value = subjectId;
    document.getElementById('book_topic').value = '';
    document.getElementById('book_desc').value = '';
    document.getElementById('char_count').innerText = '0 / 20 characters';

    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    modal.show();
}

window.submitBooking = async function () {
    const slotId = document.getElementById('book_slot_id').value;
    const subjectId = document.getElementById('book_subject_id').value;
    const topic = document.getElementById('book_topic').value;
    const desc = document.getElementById('book_desc').value;

    if (!topic || desc.length < 20) {
        alert("Please provide a topic and a description of at least 20 characters.");
        return;
    }

    const res = await fetch('../api/student.php?action=book_slot', {
        method: 'POST',
        body: JSON.stringify({ slot_id: slotId, subject_id: subjectId, topic, description: desc })
    });
    const data = await res.json();
    if (data.success) {
        alert("Booking request submitted! Wait for teacher's approval.");
        bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
        loadMyBookings();
    } else {
        alert(data.message || "Booking failed.");
    }
}

async function loadMyBookings() {
    const res = await fetch('../api/student.php?action=get_my_bookings');
    const data = await res.json();
    const body = document.getElementById('bookings_table_body');

    if (!data.bookings || data.bookings.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">No bookings found.</td></tr>';
        return;
    }

    let html = '';
    data.bookings.forEach(b => {
        const badgeClass = b.status === 'accepted' ? 'bg-success' : (b.status === 'rejected' ? 'bg-danger' : 'bg-warning');
        html += `
            <tr>
                <td>
                    <div class="fw-bold">${b.date}</div>
                    <small class="text-muted">${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)} (${b.mode})</small>
                </td>
                <td>${b.teacher_name}</td>
                <td>
                    <div class="text-primary">${b.topic}</div>
                    <small class="text-muted">${b.subject_name}</small>
                </td>
                <td>
                    <span class="badge ${badgeClass}" style="cursor: pointer" onclick="showBookingStatusDetails('${b.status}', '${b.status === 'accepted' ? (b.teacher_notes || '').replace(/'/g, "\\'") : (b.rejection_reason || '').replace(/'/g, "\\'")}')">${b.status.toUpperCase()}</span>
                </td>
            </tr>
        `;
    });
    body.innerHTML = html;
}

window.showBookingStatusDetails = function (status, msg) {
    if (!msg) return;
    alert(`${status.toUpperCase()}: ${msg}`);
}

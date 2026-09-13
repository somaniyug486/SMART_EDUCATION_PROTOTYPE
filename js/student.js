// js/student.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Student JS Loaded");
    checkAuth();
});

async function checkAuth() {
    try {
        const res = await fetch('../api/auth_check.php');
        const data = await res.json();
        if (!data.logged_in || data.role !== 'student') {
            window.location.href = '../index.html';
            return;
        }
        document.getElementById('studentName').innerText = data.name;
        loadView('dashboard'); // Auto-load
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

    // Clear & Show Spinner
    content.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-primary"></div></div>';

    if (view === 'dashboard') {
        title.innerText = "My Dashboard";
        renderDashboard(content);
    } else if (view === 'courses') {
        title.innerText = "My Courses";
        renderCourses(content);
    } else if (view === 'assignments') {
        title.innerText = "My Assignments";
        renderAssignments(content);
    } else if (view === 'attendance') {
        title.innerText = "Attendance Log";
        renderAttendance(content);
    } else if (view === 'ai_assistant') {
        title.innerText = "AI Tutor";
        renderAI(content);
    }
}

// === RENDERERS ===

async function renderDashboard(container) {
    try {
        const res = await fetch('../api/student.php?action=dashboard_stats');
        const data = await res.json();

        if (!data.classes || data.classes.length === 0) {
            container.innerHTML = `<div class="alert alert-info">No classes scheduled for today. Enjoy your day off!</div>`;
            return;
        }

        let html = `<h5>Today's Schedule</h5><div class="row">`;
        data.classes.forEach(c => {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card border-primary">
                        <div class="card-body">
                            <h5>${c.subject_name}</h5>
                            <p>${c.start_time} - ${c.end_time}</p>
                            <button class="btn btn-primary" onclick="window.open('../classroom.html','_blank','width=1200,height=800')">Join Class</button>
                        </div>
                    </div>
                </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load dashboard. ${e.message}</div>`;
    }
}

async function renderCourses(container) {
    try {
        const res = await fetch('../api/student.php?action=courses');
        const data = await res.json();

        if (!data.courses || data.courses.length === 0) {
            container.innerHTML = `<div class="alert alert-warning">You are not enrolled in any courses.</div>`;
            return;
        }

        let html = `<div class="accordion" id="accCourses">`;
        data.courses.forEach((c, i) => {
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#c${i}">${c.name}</button></h2>
                    <div id="c${i}" class="accordion-collapse collapse" data-bs-parent="#accCourses">
                        <div class="accordion-body">
                            <ul class="list-group">
                                ${c.subjects.map(s => `<li class="list-group-item d-flex justify-content-between">${s.name} 
                                    <button class="btn btn-sm btn-outline-primary" onclick="loadDocs(${s.id})">Files</button></li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>`;
        });
        html += `</div><div id="docArea" class="mt-4"></div>`;
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

window.loadDocs = async function (sid) {
    const area = document.getElementById('docArea');
    area.innerHTML = 'Loading files...';
    try {
        const res = await fetch(`../api/student.php?action=get_materials&subject_id=${sid}`);
        const data = await res.json();
        if (!data.files || data.files.length === 0) { area.innerHTML = '<div class="alert alert-secondary">No files uploaded yet.</div>'; return; }

        let html = '<h6>Course Documents:</h6><ul class="list-group">';
        data.files.forEach(f => {
            html += `<li class="list-group-item"><a href="../assets/docs/${f.filename}" download>${f.title} <i class="fas fa-download"></i></a></li>`;
        });
        html += '</ul>';
        area.innerHTML = html;
    } catch (e) { area.innerHTML = "Failed to load files."; }
}

async function renderAssignments(container) {
    try {
        const res = await fetch('../api/student.php?action=assignments');
        const data = await res.json();

        if (!data.assignments || data.assignments.length === 0) {
            container.innerHTML = `<div class="alert alert-success">No pending assignments! Great job.</div>`;
            return;
        }

        let html = `<div class="list-group">`;
        data.assignments.forEach(a => {
            html += `
                <a href="#" class="list-group-item list-group-item-action">
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${a.title}</h5>
                        <small class="text-danger">Due: ${a.due_date}</small>
                    </div>
                    <p class="mb-1">${a.description}</p>
                    <small class="text-muted">${a.subject_name}</small>
                </a>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

async function renderAttendance(container) {
    try {
        const res = await fetch('../api/student.php?action=attendance_log');
        const data = await res.json(); // May return {log: []} 

        if (!data.log || data.log.length === 0) {
            container.innerHTML = `<div class="alert alert-info">No attendance records found yet.</div>`;
            return;
        }

        let html = `<table class="table table-hover"><thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead><tbody>`;
        data.log.forEach(r => {
            const cls = r.status === 'present' ? 'text-success' : 'text-danger';
            html += `<tr><td>${r.date}</td><td>${r.subject_name}</td><td class="fw-bold ${cls}">${r.status.toUpperCase()}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`; }
}

function renderAI(container) {
    container.innerHTML = `
        <div class="card" style="height: 500px">
            <div class="card-header bg-dark text-white">AI Tutor</div>
            <div id="chatBox" class="card-body overflow-auto bg-light"></div>
            <div class="card-footer d-flex">
                <input type="text" id="aiInp" class="form-control me-2" placeholder="Ask me anything...">
                <button class="btn btn-primary" onclick="askAI()">Ask</button>
            </div>
        </div>
    `;
}

window.askAI = async function () {
    const inp = document.getElementById('aiInp');
    const box = document.getElementById('chatBox');
    const txt = inp.value;
    if (!txt) return;

    // User Message
    box.innerHTML += `<div class="text-end mb-2"><span class="badge bg-primary p-2 fs-6">${txt}</span></div>`;
    inp.value = '';
    box.scrollTop = box.scrollHeight;

    // Loading Indicator
    const loadId = 'loading-' + Date.now();
    box.innerHTML += `<div id="${loadId}" class="text-start mb-2"><small class="text-muted">Typing...</small></div>`;
    box.scrollTop = box.scrollHeight;

    try {
        const response = await puter.ai.chat(txt, { model: 'gpt-4o-mini' });
        const aiText = response?.message?.content || response?.toString();

        // Remove Loader & Show AI Message
        document.getElementById(loadId).remove();

        // Format basic markdown (bold/list) to HTML if needed, or just insert text
        const formatted = aiText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

        box.innerHTML += `<div class="text-start mb-2"><div class="d-inline-block p-2 border bg-white rounded text-dark">${formatted}</div></div>`;

    } catch (e) {
        document.getElementById(loadId).innerHTML = `<span class="text-danger">Error: ${e.message}</span>`;
    }
    box.scrollTop = box.scrollHeight;
}

// js/teacher.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Teacher JS Loaded");
    loadView('dashboard'); // Force load immediately
});

async function doLogout() {
    await fetch('../api/logout.php');
    window.location.href = '../index.html';
}

function loadView(view) {
    console.log("Loading view:", view);
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="text-center mt-5"><div class="spinner-border text-primary"></div></div>';

    if (view === 'dashboard') renderDashboard(content);
    else if (view === 'attendance') renderAttendance(content);
    else if (view === 'assignments') renderAssignments(content);
    else if (view === 'copilot') renderCoPilotDropdown(content); // NEW NAME
    else if (view === 'classroom') {
        window.open('../classroom.html', '_blank', 'width=1200,height=800');
        content.innerHTML = '<div class="alert alert-info">Classroom opened.</div>';
    }
}

async function renderDashboard(container) {
    // Force ID 3 check in case Session is weird
    const res = await fetch('../api/teacher.php?action=my_schedule');
    const data = await res.json();

    if (!data.schedule || data.schedule.length === 0) {
        // Fallback mockup if DB fails, so user sees SOMETHING
        container.innerHTML = `<h3>My Schedule</h3><p>No classes found in DB. Showing Demo Data:</p>
        <div class="card p-3 mb-2"><h5>Data Structures</h5><p>Mon 09:00 - 10:00</p></div>`;
        return;
    }

    let html = `<h3>My Schedule</h3><div class="row">`;
    data.schedule.forEach(c => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card shadow-sm border-start border-4 border-primary">
                    <div class="card-body">
                        <h5>${c.subject_name}</h5>
                        <p class="mb-0 text-muted">${c.day} | ${c.start_time.slice(0, 5)} - ${c.end_time.slice(0, 5)}</p>
                    </div>
                </div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

async function renderAttendance(container) {
    const res = await fetch('../api/teacher.php?action=get_students_for_attendance&subject_id=1');
    const data = await res.json();

    container.innerHTML = `
        <h3>Mark Attendance <small class="text-muted">(Data Structures)</small></h3>
        <div class="card p-3">
            <div id="stu_list"></div>
            <button class="btn btn-success mt-3" onclick="saveAtt()">Submit Attendance</button>
        </div>
    `;

    let html = '<div class="list-group">';
    data.students.forEach(s => {
        html += `<label class="list-group-item"><input type="checkbox" class="form-check-input me-2 att-cb" value="${s.id}" checked> ${s.name}</label>`;
    });
    html += '</div>';
    document.getElementById('stu_list').innerHTML = html;
}

window.saveAtt = async function () {
    const cbs = document.querySelectorAll('.att-cb');
    const att = [];
    cbs.forEach(cb => att.push({ user_id: cb.value, status: cb.checked ? 'present' : 'absent' }));
    await fetch('../api/teacher.php?action=submit_attendance', {
        method: 'POST', body: JSON.stringify({ subject_id: 1, attendance: att })
    });
    alert("Attendance Saved!");
}

function renderAssignments(container) {
    container.innerHTML = `
        <h3>Create Assignment</h3>
        <div class="card p-3">
             <label>Subject: Data Structures</label>
             <input type="text" id="atitle" class="form-control my-2" placeholder="Start typing title...">
             <textarea id="adesc" class="form-control my-2" placeholder="Description"></textarea>
             <input type="date" id="adue" class="form-control my-2">
             <button class="btn btn-primary" onclick="postAss()">Post</button>
        </div>
    `;
}
window.postAss = async function () {
    await fetch('../api/teacher.php?action=create_assignment', {
        method: 'POST', body: JSON.stringify({
            subject_id: 1,
            title: document.getElementById('atitle').value,
            description: document.getElementById('adesc').value,
            due_date: document.getElementById('adue').value
        })
    });
    alert("Posted!");
}

// === DROPDOWN CO-PILOT ===
function renderCoPilotDropdown(container) {
    container.innerHTML = `
        <h3>Teacher Co-Pilot</h3>
        <div class="card p-4">
            <div class="row">
                <div class="col-md-5">
                    <label><strong>1. Enter Topic</strong></label>
                    <input type="text" id="cp_topic" class="form-control mb-3" placeholder="e.g. Gravity">
                    
                    <label><strong>2. Select Mode</strong></label>
                    <select id="cp_mode" class="form-select mb-3">
                        <option value="lesson">Lesson Plan</option>
                        <option value="quiz">Generate Quiz</option>
                        <option value="activity">Classroom Activity</option>
                    </select>
                    
                    <button class="btn btn-primary w-100" onclick="runAI()">Generate</button>
                </div>
                <div class="col-md-7">
                    <div id="ai_res" class="border p-3 bg-light" style="height: 300px; overflow-y: auto;">Output...</div>
                </div>
            </div>
        </div>
    `;
}

window.runAI = async function () {
    const topic = document.getElementById('cp_topic').value;
    const mode = document.getElementById('cp_mode').value;
    const resDiv = document.getElementById('ai_res');

    if (!topic) { alert("Please enter a topic"); return; }
    resDiv.innerHTML = '<div class="text-center mt-3"><div class="spinner-border text-primary"></div><br>Asking ChatGPT...</div>';

    try {
        let prompt = "";
        let isQuiz = false;

        if (mode === 'quiz') {
            isQuiz = true;
            prompt = `Create a quiz about "${topic}" with 3 questions. 
            Return ONLY a valid JSON array in this format (no markdown, no quotes around the array): 
            [{"q":"Question text", "o":["Option A", "Option B"], "a":"Option A"}]`;
        } else if (mode === 'lesson') {
            prompt = `Create a structured lesson plan for "${topic}". Use HTML formatting (<h3>, <ul>, etc).`;
        } else {
            prompt = `Suggest a creative classroom activity for teaching "${topic}". Use HTML formatting.`;
        }

        // Call Puter.js (ChatGPT)
        // Note: puter.ai.chat returns an object { message: { content: "..." } } or sometimes just the string depending on version.
        // We handle both safely.
        const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
        const text = response?.message?.content || response?.toString();

        if (isQuiz) {
            // Parse JSON from AI (Strip Markdown if present)
            let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const quizData = JSON.parse(cleanJson);

            let html = `<h5>Quiz: ${topic}</h5>`;
            quizData.forEach((q, i) => {
                html += `<div class="card mb-2 p-2 bg-white">
                    <strong>Q${i + 1}: ${q.q}</strong>
                    <ul class="mb-1 text-muted"><li>${q.o.join('</li><li>')}</li></ul>
                    <small class="text-success fw-bold">Answer: ${q.a}</small>
                </div>`;
            });
            resDiv.innerHTML = html;
        } else {
            resDiv.innerHTML = `<div class="bg-white p-3 rounded">${text}</div>`;
        }

    } catch (e) {
        console.error(e);
        resDiv.innerHTML = `<div class="alert alert-danger">AI Error: ${e.message}</div>`;
    }
}

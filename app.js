// ========================================
// HOSTAWAY CRM - FRONTEND APPLICATION
// This makes everything work and interactive!
// ========================================

// Configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Global State
let currentUser = null;
let allCases = [];
let allTasks = [];
let allUsers = [];
let hostawayConnected = false;

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Hostaway CRM Starting...');
    
    try {
        // Load initial data
        await loadUsers();
        await loadCases();
        await loadTasks();
        await loadStats();
        
        // Set current user (in production, this would come from authentication)
        if (allUsers.length > 0) {
            currentUser = allUsers[0];
            updateUserDisplay();
        } else {
            // Create default user if none exist
            await createDefaultUser();
        }
        
        // Check Hostaway connection
        if (currentUser) {
            await checkHostawayConnection();
        }
        
        // Render dashboard
        renderDashboard();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
        }, 500);
        
        console.log('✅ CRM Loaded Successfully!');
    } catch (error) {
        console.error('❌ Error loading CRM:', error);
        showToast('Error loading application. Please refresh.', 'error');
        document.getElementById('loading-screen').classList.add('hidden');
    }
});

// ========================================
// API FUNCTIONS
// ========================================

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// ========================================
// DATA LOADING FUNCTIONS
// ========================================

async function loadUsers() {
    try {
        allUsers = await apiCall('/users');
        console.log(`Loaded ${allUsers.length} users`);
    } catch (error) {
        console.error('Error loading users:', error);
        allUsers = [];
    }
}

async function loadCases() {
    try {
        allCases = await apiCall('/cases');
        console.log(`Loaded ${allCases.length} cases`);
    } catch (error) {
        console.error('Error loading cases:', error);
        allCases = [];
    }
}

async function loadTasks() {
    try {
        allTasks = await apiCall('/tasks');
        console.log(`Loaded ${allTasks.length} tasks`);
    } catch (error) {
        console.error('Error loading tasks:', error);
        allTasks = [];
    }
}

async function loadStats() {
    try {
        const stats = await apiCall('/stats');
        updateStatsDisplay(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function createDefaultUser() {
    try {
        const defaultUser = {
            name: 'Admin User',
            email: 'admin@hostaway-crm.com',
            password: 'password123',
            role: 'Admin',
            avatar: '👨‍💼'
        };
        currentUser = await apiCall('/users', {
            method: 'POST',
            body: JSON.stringify(defaultUser)
        });
        allUsers.push(currentUser);
        updateUserDisplay();
    } catch (error) {
        console.error('Error creating default user:', error);
    }
}

// ========================================
// TAB NAVIGATION
// ========================================

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Add active class to selected nav item
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Render content based on tab
    switch(tabName) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'cases':
            renderCases();
            break;
        case 'tasks':
            renderTasks();
            break;
        case 'team':
            renderTeam();
            break;
    }
}

// ========================================
// RENDER FUNCTIONS
// ========================================

function renderDashboard() {
    // Render recent cases
    const dashboardCases = document.getElementById('dashboard-cases');
    const recentCases = allCases.slice(0, 5);
    
    if (recentCases.length === 0) {
        dashboardCases.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No cases yet. Create your first case!</p></div>';
    } else {
        dashboardCases.innerHTML = recentCases.map(c => createCaseCard(c)).join('');
    }
}

function renderCases() {
    filterCases();
}

function filterCases() {
    const searchTerm = document.getElementById('searchCases')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || 'all';
    const priorityFilter = document.getElementById('filterPriority')?.value || 'all';
    
    let filtered = allCases.filter(c => {
        const matchesSearch = searchTerm === '' || 
            c.title.toLowerCase().includes(searchTerm) ||
            c.description.toLowerCase().includes(searchTerm) ||
            (c.propertyName && c.propertyName.toLowerCase().includes(searchTerm));
        
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesPriority;
    });
    
    const casesList = document.getElementById('cases-list');
    
    if (filtered.length === 0) {
        casesList.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><p>No cases found</p></div>';
    } else {
        casesList.innerHTML = filtered.map(c => createCaseCard(c)).join('');
    }
}

function renderTasks() {
    const statuses = ['open', 'in-progress', 'completed'];
    
    statuses.forEach(status => {
        const filtered = allTasks.filter(t => t.status === status);
        const containerId = status === 'in-progress' ? 'tasks-progress' : `tasks-${status}`;
        const container = document.getElementById(containerId);
        const countId = status === 'in-progress' ? 'progress-count' : `${status}-count`;
        
        // Update count
        document.getElementById(countId).textContent = filtered.length;
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding: 2rem 1rem;"><p style="font-size: 0.875rem;">No tasks</p></div>';
        } else {
            container.innerHTML = filtered.map(t => createTaskCard(t)).join('');
        }
    });
}

function renderTeam() {
    const teamList = document.getElementById('team-list');
    
    if (allUsers.length === 0) {
        teamList.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No team members yet</p></div>';
    } else {
        teamList.innerHTML = allUsers.map(user => {
            const userCases = allCases.filter(c => c.assignedTo && c.assignedTo._id === user._id).length;
            const userTasks = allTasks.filter(t => t.assignedTo && t.assignedTo._id === user._id).length;
            const completedTasks = allTasks.filter(t => t.assignedTo && t.assignedTo._id === user._id && t.status === 'completed').length;
            
            return `
                <div class="team-card">
                    <div class="team-avatar">${user.avatar || '👤'}</div>
                    <div class="team-name">${user.name}</div>
                    <div class="team-role">${user.role}</div>
                    <div class="team-email">${user.email}</div>
                    <div class="team-stats">
                        <div class="team-stat">
                            <span><i class="fas fa-folder"></i> Assigned Cases:</span>
                            <strong>${userCases}</strong>
                        </div>
                        <div class="team-stat">
                            <span><i class="fas fa-tasks"></i> Active Tasks:</span>
                            <strong>${userTasks}</strong>
                        </div>
                        <div class="team-stat">
                            <span><i class="fas fa-check-circle"></i> Completed:</span>
                            <strong style="color: var(--success);">${completedTasks}</strong>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ========================================
// CARD CREATORS
// ========================================

function createCaseCard(c) {
    const assignedToName = c.assignedTo ? c.assignedTo.name : 'Unassigned';
    const statusClass = c.status === 'in-progress' ? 'progress' : c.status;
    
    return `
        <div class="card case-card ${c.priority}" onclick="showCaseDetail('${c._id}')">
            <div class="card-header">
                <div class="card-title">${c.title}</div>
                <div class="card-badges">
                    <span class="badge badge-${statusClass}">${c.status.replace('-', ' ')}</span>
                    <span class="badge badge-${c.priority}">${c.priority}</span>
                </div>
            </div>
            <div class="card-description">${c.description}</div>
            <div class="card-meta">
                ${c.propertyName ? `<span><i class="fas fa-building"></i>${c.propertyName}</span>` : ''}
                ${c.hostawayReservationId ? `<span><i class="fas fa-hotel"></i>${c.hostawayReservationId}</span>` : ''}
                <span><i class="fas fa-user"></i>${assignedToName}</span>
                <span><i class="fas fa-clock"></i>${formatDate(c.updatedAt)}</span>
                <span><i class="fas fa-comments"></i>${c.comments ? c.comments.length : 0}</span>
            </div>
        </div>
    `;
}

function createTaskCard(t) {
    const assignedToName = t.assignedTo ? t.assignedTo.name : 'Unassigned';
    const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date';
    
    return `
        <div class="task-card">
            <div class="task-title">${t.title}</div>
            ${t.description ? `<div class="card-description" style="font-size: 0.875rem; margin-bottom: 0.75rem;">${t.description}</div>` : ''}
            <div class="task-meta">
                <div><i class="fas fa-calendar"></i> ${dueDate}</div>
                <div><i class="fas fa-user"></i> ${assignedToName}</div>
                <div><span class="badge badge-${t.priority}">${t.priority}</span></div>
            </div>
            ${t.status !== 'completed' ? `
                <button class="btn btn-${t.status === 'open' ? 'primary' : 'success'}" 
                        style="width: 100%; margin-top: 0.75rem;"
                        onclick="updateTaskStatus('${t._id}', '${t.status === 'open' ? 'in-progress' : 'completed'}')">
                    <i class="fas fa-${t.status === 'open' ? 'play' : 'check'}"></i>
                    ${t.status === 'open' ? 'Start Task' : 'Complete'}
                </button>
            ` : `
                <div style="text-align: center; color: var(--success); margin-top: 0.75rem;">
                    <i class="fas fa-check-circle"></i> Completed
                </div>
            `}
        </div>
    `;
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function showConnectModal() {
    document.getElementById('connect-modal').classList.add('active');
}

function showNewCaseModal() {
    // Populate assignee dropdown
    const select = document.getElementById('case-assigned');
    select.innerHTML = allUsers.map(u => 
        `<option value="${u._id}">${u.name}</option>`
    ).join('');
    
    // Set default to current user
    if (currentUser) {
        select.value = currentUser._id;
    }
    
    document.getElementById('case-modal').classList.add('active');
}

function showNewTaskModal() {
    // Set default due date to 7 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    document.getElementById('task-due').value = dueDate.toISOString().split('T')[0];
    
    // Populate assignee dropdown
    const select = document.getElementById('task-assigned');
    select.innerHTML = allUsers.map(u => 
        `<option value="${u._id}">${u.name}</option>`
    ).join('');
    
    // Set default to current user
    if (currentUser) {
        select.value = currentUser._id;
    }
    
    document.getElementById('task-modal').classList.add('active');
}

function showNewUserModal() {
    document.getElementById('user-modal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ========================================
// CASE FUNCTIONS
// ========================================

async function createCase(event) {
    event.preventDefault();
    
    try {
        const caseData = {
            title: document.getElementById('case-title').value,
            description: document.getElementById('case-description').value,
            priority: document.getElementById('case-priority').value,
            status: 'open',
            assignedTo: document.getElementById('case-assigned').value,
            createdBy: currentUser._id,
            propertyName: document.getElementById('case-property').value,
            hostawayReservationId: document.getElementById('case-reservation').value
        };
        
        const newCase = await apiCall('/cases', {
            method: 'POST',
            body: JSON.stringify(caseData)
        });
        
        allCases.unshift(newCase);
        closeModal('case-modal');
        event.target.reset();
        
        showToast('✅ Case created successfully!', 'success');
        
        // Refresh views
        await loadStats();
        renderDashboard();
        renderCases();
    } catch (error) {
        console.error('Error creating case:', error);
        showToast('❌ Error creating case', 'error');
    }
}

async function showCaseDetail(caseId) {
    try {
        const caseData = await apiCall(`/cases/${caseId}`);
        
        const modal = document.getElementById('case-detail-modal');
        const content = document.getElementById('case-detail-content');
        
        document.getElementById('case-detail-title').textContent = caseData.title;
        
        content.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="flex: 1;">
                        <label class="form-label">Status</label>
                        <select class="form-select" id="case-status-update" onchange="updateCaseField('${caseData._id}', 'status', this.value)">
                            <option value="open" ${caseData.status === 'open' ? 'selected' : ''}>Open</option>
                            <option value="in-progress" ${caseData.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${caseData.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="closed" ${caseData.status === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="form-label">Priority</label>
                        <select class="form-select" id="case-priority-update" onchange="updateCaseField('${caseData._id}', 'priority', this.value)">
                            <option value="low" ${caseData.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${caseData.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${caseData.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Description</h3>
                    <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius);">
                        ${caseData.description}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    ${caseData.propertyName ? `
                        <div>
                            <label class="form-label">Property</label>
                            <div><i class="fas fa-building"></i> ${caseData.propertyName}</div>
                        </div>
                    ` : ''}
                    ${caseData.hostawayReservationId ? `
                        <div>
                            <label class="form-label">Reservation ID</label>
                            <div><i class="fas fa-hotel"></i> ${caseData.hostawayReservationId}</div>
                        </div>
                    ` : ''}
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <label class="form-label">Assigned To</label>
                    <select class="form-select" onchange="updateCaseField('${caseData._id}', 'assignedTo', this.value)">
                        ${allUsers.map(u => `
                            <option value="${u._id}" ${caseData.assignedTo && caseData.assignedTo._id === u._id ? 'selected' : ''}>
                                ${u.avatar} ${u.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
            
            <div class="comments-section">
                <h3 style="font-weight: 600; margin-bottom: 1rem;">
                    <i class="fas fa-comments"></i> Comments (${caseData.comments ? caseData.comments.length : 0})
                </h3>
                
                <div id="comments-list">
                    ${caseData.comments && caseData.comments.length > 0 ? caseData.comments.map(comment => `
                        <div class="comment">
                            <div class="comment-avatar">${comment.user ? comment.user.avatar : '👤'}</div>
                            <div class="comment-content">
                                <div class="comment-header">
                                    <span class="comment-author">${comment.user ? comment.user.name : 'Unknown'}</span>
                                    <span class="comment-time">${formatDate(comment.timestamp)}</span>
                                </div>
                                <div class="comment-text">${comment.text}</div>
                            </div>
                        </div>
                    `).join('') : '<p style="color: var(--gray-400); text-align: center; padding: 2rem;">No comments yet</p>'}
                </div>
                
                <div class="comment-form">
                    <div style="flex: 1;">
                        <textarea class="form-textarea" id="new-comment" placeholder="Add a comment..." rows="3"></textarea>
                        <button class="btn btn-primary" style="margin-top: 0.5rem;" onclick="addComment('${caseData._id}')">
                            <i class="fas fa-paper-plane"></i> Add Comment
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading case details:', error);
        showToast('❌ Error loading case details', 'error');
    }
}

async function updateCaseField(caseId, field, value) {
    try {
        const updates = { [field]: value };
        await apiCall(`/cases/${caseId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        // Update local data
        const caseIndex = allCases.findIndex(c => c._id === caseId);
        if (caseIndex !== -1) {
            allCases[caseIndex] = { ...allCases[caseIndex], ...updates };
        }
        
        showToast('✅ Case updated', 'success');
        
        // Refresh views
        await loadCases();
        await loadStats();
        renderDashboard();
        renderCases();
    } catch (error) {
        console.error('Error updating case:', error);
        showToast('❌ Error updating case', 'error');
    }
}

async function addComment(caseId) {
    const commentText = document.getElementById('new-comment').value.trim();
    
    if (!commentText) {
        showToast('Please enter a comment', 'error');
        return;
    }
    
    try {
        const commentData = {
            user: currentUser._id,
            text: commentText,
            timestamp: new Date()
        };
        
        await apiCall(`/cases/${caseId}/comments`, {
            method: 'POST',
            body: JSON.stringify(commentData)
        });
        
        showToast('✅ Comment added', 'success');
        
        // Refresh case detail
        await loadCases();
        await showCaseDetail(caseId);
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('❌ Error adding comment', 'error');
    }
}

// ========================================
// TASK FUNCTIONS
// ========================================

async function createTask(event) {
    event.preventDefault();
    
    try {
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            priority: document.getElementById('task-priority').value,
            status: 'open',
            assignedTo: document.getElementById('task-assigned').value,
            createdBy: currentUser._id,
            dueDate: document.getElementById('task-due').value
        };
        
        const newTask = await apiCall('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
        
        allTasks.unshift(newTask);
        closeModal('task-modal');
        event.target.reset();
        
        showToast('✅ Task created successfully!', 'success');
        renderTasks();
    } catch (error) {
        console.error('Error creating task:', error);
        showToast('❌ Error creating task', 'error');
    }
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        await apiCall(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        // Update local data
        const taskIndex = allTasks.findIndex(t => t._id === taskId);
        if (taskIndex !== -1) {
            allTasks[taskIndex].status = newStatus;
        }
        
        showToast('✅ Task updated', 'success');
        renderTasks();
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('❌ Error updating task', 'error');
    }
}

// ========================================
// USER FUNCTIONS
// ========================================

async function createUser(event) {
    event.preventDefault();
    
    try {
        const userData = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            role: document.getElementById('user-role').value,
            avatar: document.getElementById('user-avatar').value || '👤',
            password: 'password123' // Default password
        };
        
        const newUser = await apiCall('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        allUsers.push(newUser);
        closeModal('user-modal');
        event.target.reset();
        
        showToast('✅ Team member added!', 'success');
        renderTeam();
    } catch (error) {
        console.error('Error creating user:', error);
        showToast('❌ Error adding team member', 'error');
    }
}

// ========================================
// HOSTAWAY FUNCTIONS
// ========================================

async function connectHostaway() {
    const apiKey = document.getElementById('api-key').value.trim();
    
    if (!apiKey) {
        showToast('Please enter an API key', 'error');
        return;
    }
    
    try {
        await apiCall('/hostaway/connect', {
            method: 'POST',
            body: JSON.stringify({
                apiKey,
                userId: currentUser._id
            })
        });
        
        hostawayConnected = true;
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('connectionStatus').style.display = 'flex';
        
        closeModal('connect-modal');
        showToast('✅ Connected to Hostaway!', 'success');
    } catch (error) {
        console.error('Error connecting to Hostaway:', error);
        showToast('❌ Error connecting to Hostaway', 'error');
    }
}

async function checkHostawayConnection() {
    try {
        const status = await apiCall(`/hostaway/status/${currentUser._id}`);
        
        if (status.isConnected) {
            hostawayConnected = true;
            document.getElementById('connectBtn').style.display = 'none';
            document.getElementById('connectionStatus').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error checking Hostaway connection:', error);
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role;
        document.getElementById('userAvatar').textContent = currentUser.avatar || '👤';
    }
}

function updateStatsDisplay(stats) {
    if (stats && stats.cases) {
        document.getElementById('stat-total').textContent = stats.cases.total;
        document.getElementById('stat-open').textContent = stats.cases.open;
        document.getElementById('stat-progress').textContent = stats.cases.inProgress;
        document.getElementById('stat-completed').textContent = stats.cases.completed;
        document.getElementById('stat-high').textContent = stats.cases.highPriority;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

document.addEventListener('keydown', (e) => {
    // Escape key closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    // Ctrl/Cmd + N for new case
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showNewCaseModal();
    }
});

console.log('📱 Hostaway CRM Loaded - Ready to use!');

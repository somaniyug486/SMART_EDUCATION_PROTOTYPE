/**
 * NOTIFICATION MANAGER
 * Purpose: This file handles the real-time "Bell" system. 
 * It check for new messages from teachers and shows alerts to the student.
 * 
 * Think of this as a "Personal Assistant" that constantly checks for new mail.
 */

class NotificationManager {
    constructor() {
        this.unreadCount = 0;
        this.pollInterval = 30000; // Check for new mail every 30 seconds.
        this.notifications = [];
        this.init();
    }

    init() {
        // 1. Create the UI (the bell icon).
        this.createNotificationBell();
        // 2. Start the timer to check periodically.
        this.startPolling();
        // 3. Do the first check right now.
        this.fetchNotifications();

        // Listen for language changes to update the text.
        window.addEventListener('languageChanged', () => {
            this.updateUILabel();
            this.renderNotifications();
        });
    }

    // Update labels like "Notifications" -> "सूचनाएं" (Hindi)
    updateUILabel() {
        const i18n = window.i18n;
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        const headerText = panel.querySelector('.card-header span');
        if (headerText) headerText.innerHTML = `<i class="fas fa-bell me-2"></i>${i18n ? i18n.get('notifications') : 'Notifications'}`;

        const markAllBtn = panel.querySelector('.card-header button small');
        if (markAllBtn) markAllBtn.innerText = i18n ? i18n.get('mark_all_read') : 'Mark all read';
    }

    // Creates the little bell icon you see in the top bar.
    createNotificationBell() {
        if (document.getElementById('notificationBell')) return;

        const navbar = document.querySelector('.navbar') || document.querySelector('nav');
        if (!navbar) {
            console.warn('Navbar not found, cannot add notification bell');
            return;
        }

        const i18n = window.i18n;
        // The HTML for the bell and the dropdown list.
        const bellHTML = `
            <div class="position-relative d-inline-block me-3" id="notificationBell">
                <button class="btn btn-link text-white position-relative" onclick="notificationManager.toggleNotificationPanel()">
                    <i class="fas fa-bell fa-lg"></i>
                    <span id="notificationBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display:none;">
                        0
                    </span>
                </button>
                
                <!-- The Dropdown List -->
                <div id="notificationPanel" class="card position-absolute shadow-lg" style="display:none; right:0; width:350px; max-height:400px; overflow-y:auto; z-index:9999; top:45px;">
                    <div class="card-header bg-primary text-white d-flex justify-content-between">
                        <span><i class="fas fa-bell me-2"></i>${i18n ? i18n.get('notifications') : 'Notifications'}</span>
                        <button class="btn btn-sm btn-link text-white p-0" onclick="notificationManager.markAllRead()">
                            <small>${i18n ? i18n.get('mark_all_read') : 'Mark all read'}</small>
                        </button>
                    </div>
                    <div class="card-body p-0" id="notificationList">
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-inbox fa-2x mb-2"></i>
                            <p>${i18n ? i18n.get('no_notifications') : 'No notifications'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const target = navbar.querySelector('.d-flex.align-items-center') || navbar.querySelector('div');
        if (target) {
            target.insertAdjacentHTML('beforeend', bellHTML);
        }
    }

    // The main function that talks to the server (notifications.php).
    async fetchNotifications() {
        try {
            const res = await fetch('../api/notifications.php?action=get_notifications&limit=20');
            const data = await res.json();

            if (data.success) {
                this.notifications = data.notifications;
                this.unreadCount = data.unread_count;
                this.updateBadge(); // Show the number of new messages.
                this.renderNotifications(); // Draw the list.

                // If a brand new message arrives, show a "Toast" (popup alert).
                if (this.unreadCount > 0 && this.shouldShowToast()) {
                    this.showToast(data.notifications[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }

    // Updates the red number on the bell.
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Creates the HTML for each notification item.
    renderNotifications() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        const i18n = window.i18n;
        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>${i18n ? i18n.get('no_notifications') : 'No notifications'}</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.notifications.forEach(notif => {
            const isUnread = notif.is_read == 0;
            const bgClass = isUnread ? 'bg-light' : '';
            const icon = this.getNotificationIcon(notif.type);
            const titleTranslated = i18n ? i18n.get(notif.title) : notif.title;
            const msgTranslated = i18n ? i18n.get(notif.message) : notif.message;

            html += `
                <div class="border-bottom p-3 ${bgClass}" onclick="notificationManager.markAsRead(${notif.id})">
                    <div class="d-flex">
                        <div class="me-2">
                            <i class="${icon} text-primary"></i>
                        </div>
                        <div class="flex-grow-1">
                            <strong>${titleTranslated}</strong>
                            <p class="mb-1 small">${msgTranslated}</p>
                            <small class="text-muted">${this.formatTime(notif.created_at)}</small>
                        </div>
                        ${isUnread ? `<div class="ms-2"><span class="badge bg-primary">${i18n ? i18n.get('new') : 'New'}</span></div>` : ''}
                    </div>
                </div>
            `;
        });

        list.innerHTML = html;
    }

    // Helper to get nice icons for different types of alerts.
    getNotificationIcon(type) {
        const icons = {
            'assignment_upload': 'fas fa-book',
            'due_date': 'fas fa-clock',
            'class_starting': 'fas fa-chalkboard-teacher',
            'assignment_overdue': 'fas fa-exclamation-triangle',
            'live_class_started': 'fas fa-video text-danger animate-pulse'
        };
        return icons[type] || 'fas fa-info-circle';
    }

    // Shows/Hides the notification dropdown.
    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    }

    // Tell the server "I have seen this message".
    async markAsRead(notificationId) {
        try {
            await fetch('../api/notifications.php?action=mark_read', {
                method: 'POST',
                body: JSON.stringify({ notification_id: notificationId })
            });
            this.fetchNotifications(); // Refresh the list
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    }

    // Popup alert that appears in the corner.
    showToast(notification) {
        const toastHTML = `
            <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index:99999;">
                <div class="toast show" role="alert">
                    <div class="toast-header bg-primary text-white">
                        <i class="${this.getNotificationIcon(notification.type)} me-2"></i>
                        <strong class="me-auto">${notification.title}</strong>
                        <button type="button" class="btn-close btn-close-white" onclick="this.closest('.toast-container').remove()"></button>
                    </div>
                    <div class="toast-body">
                        ${notification.message}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', toastHTML);

        setTimeout(() => {
            const toastElement = document.querySelector('.toast-container:last-of-type');
            if (toastElement) toastElement.remove();
        }, 5000);
    }

    // Start the periodic checking loop.
    startPolling() {
        setInterval(() => {
            this.fetchNotifications();
        }, this.pollInterval);
    }
}

// Initializing the manager when the page loads.
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
});


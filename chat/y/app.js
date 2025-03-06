// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGUszxHHy4PD8PGj-ph-nxegxa7oLhx2g",
    authDomain: "chat-app-90e84.firebaseapp.com",
    databaseURL: "https://chat-app-90e84-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "chat-app-90e84",
    storageBucket: "chat-app-90e84.firebasestorage.app",
    messagingSenderId: "299660775885",
    appId: "1:299660775885:web:adf762b8a530f17f1f7484",
    measurementId: "G-ZZ158RWVRR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const chatApp = document.getElementById('chatApp');
const usernameInput = document.getElementById('usernameInput');
const enterChatBtn = document.getElementById('enterChat');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');
const chatMessages = document.getElementById('chatMessages');
const currentUserSpan = document.getElementById('currentUser');
const leaveChatBtn = document.getElementById('leaveChat');
const usersList = document.getElementById('usersList');
const userSearch = document.getElementById('userSearch');
const noChatSelected = document.getElementById('noChatSelected');
const activeChat = document.getElementById('activeChat');
const chatWithUser = document.getElementById('chatWithUser');
const userStatus = document.getElementById('userStatus');
const typingStatus = document.getElementById('typingStatus');
const themeToggle = document.getElementById('themeToggle');
const notificationSound = document.getElementById('notificationSound');

let currentUsername = '';
let selectedUser = null;
let currentUserRef = null;
let messagesRef = null;
let typingTimeout = null;
let currentTheme = localStorage.getItem('theme') || 'system';

// Theme Management
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    currentTheme = theme;
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = currentTheme === 'dark' || 
                  (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
}

function toggleTheme() {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
}

// Initialize theme
setTheme(currentTheme);

// Notification Management
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

function showNotification(message) {
    if (document.hidden && Notification.permission === 'granted') {
        const notification = new Notification('New Message', {
            body: `${message.sender}: ${message.text}`,
            icon: '/favicon.ico'
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
    notificationSound.play();
}

// Typing Status Management
function updateTypingStatus(isTyping) {
    if (!selectedUser) return;
    
    const typingRef = database.ref(`users/${currentUsername}/typing`);
    typingRef.set(isTyping ? selectedUser : null);
}

function showTypingIndicator() {
    typingStatus.innerHTML = `
        <div class="typing-animation">
            <span></span><span></span><span></span>
        </div>
    `;
}

function hideTypingIndicator() {
    typingStatus.innerHTML = '';
}

// Message Status Management
function updateMessageStatus(messageId, status) {
    if (!messagesRef) return;
    messagesRef.child(messageId).update({ status });
}

function getStatusIcon(status) {
    switch(status) {
        case 'sent': return '<i class="fas fa-check"></i>';
        case 'delivered': return '<i class="fas fa-check-double"></i>';
        case 'read': return '<i class="fas fa-check-double status-read"></i>';
        default: return '<i class="fas fa-clock"></i>';
    }
}

// Helper Functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createMessageElement(message, isOwnMessage) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    messageDiv.id = `message-${message.id}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = message.text;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'time';
    timeDiv.innerHTML = `${formatTime(message.timestamp)} ${
        isOwnMessage ? `<span class="message-status">${getStatusIcon(message.status || 'sent')}</span>` : ''
    }`;
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);

    if (isOwnMessage) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        actionsDiv.innerHTML = `
            <button class="action-btn" onclick="deleteMessage('${message.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
        messageDiv.appendChild(actionsDiv);
    }
    
    return messageDiv;
}

function createUserElement(username, isOnline) {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.dataset.username = username;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'user-avatar';
    avatarDiv.textContent = username.charAt(0).toUpperCase();

    const userInfoDiv = document.createElement('div');
    userInfoDiv.className = 'user-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'user-name';
    nameDiv.textContent = username;

    const statusDiv = document.createElement('div');
    statusDiv.className = 'last-message';
    statusDiv.textContent = isOnline ? 'Online' : 'Offline';

    userInfoDiv.appendChild(nameDiv);
    userInfoDiv.appendChild(statusDiv);

    userDiv.appendChild(avatarDiv);
    userDiv.appendChild(userInfoDiv);

    userDiv.addEventListener('click', () => selectUser(username));

    return userDiv;
}

function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

function selectUser(username) {
    if (username === currentUsername) return;
    
    // Update UI
    const previousSelected = usersList.querySelector('.active');
    if (previousSelected) {
        previousSelected.classList.remove('active');
    }
    
    const userElement = usersList.querySelector(`[data-username="${username}"]`);
    if (userElement) {
        userElement.classList.add('active');
    }

    selectedUser = username;
    chatWithUser.textContent = username;
    noChatSelected.classList.add('hidden');
    activeChat.classList.remove('hidden');

    // Load chat messages
    loadChat(username);
}

function loadChat(otherUser) {
    const chatId = getChatId(currentUsername, otherUser);
    
    if (messagesRef) {
        messagesRef.off();
    }

    chatMessages.innerHTML = '';
    
    // Listen for typing status
    database.ref(`users/${otherUser}/typing`).on('value', (snapshot) => {
        const typingUser = snapshot.val();
        if (typingUser === currentUsername) {
            showTypingIndicator();
        } else {
            hideTypingIndicator();
        }
    });

    // Subscribe to messages
    messagesRef = database.ref(`chats/${chatId}/messages`);
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        const isOwnMessage = message.sender === currentUsername;
        
        if (!isOwnMessage && message.status === 'delivered') {
            updateMessageStatus(message.id, 'read');
        }
        
        const messageElement = createMessageElement(message, isOwnMessage);
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (!isOwnMessage && selectedUser === message.sender) {
            showNotification(message);
        }
    });

    // Subscribe to message status changes
    messagesRef.on('child_changed', (snapshot) => {
        const message = snapshot.val();
        const messageElement = document.getElementById(`message-${message.id}`);
        if (messageElement) {
            const statusElement = messageElement.querySelector('.message-status');
            if (statusElement) {
                statusElement.innerHTML = getStatusIcon(message.status);
            }
        }
    });
}

function sendMessage(text) {
    if (!text.trim() || !selectedUser) return;

    const chatId = getChatId(currentUsername, selectedUser);
    const messageRef = database.ref(`chats/${chatId}/messages`).push();
    
    const message = {
        id: messageRef.key,
        sender: currentUsername,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        status: 'sent'
    };

    messageRef.set(message).then(() => {
        updateMessageStatus(message.id, 'delivered');
    });

    messageInput.value = '';
    updateTypingStatus(false);
}

function deleteMessage(messageId) {
    if (confirm('Delete this message?')) {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
            messageElement.remove();
            messagesRef.child(messageId).remove();
        }
    }
}

function updateUsersList() {
    database.ref('users').on('value', (snapshot) => {
        usersList.innerHTML = '';
        const users = snapshot.val() || {};
        
        Object.entries(users)
            .filter(([username]) => username !== currentUsername)
            .forEach(([username, userData]) => {
                const userElement = createUserElement(username, userData.online);
                usersList.appendChild(userElement);
            });
    });
}

function setUserOnlineStatus(online) {
    if (currentUserRef) {
        currentUserRef.update({ online });
    }
}

// Event Listeners
enterChatBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        currentUsername = username;
        currentUserSpan.textContent = username;
        currentUserRef = database.ref(`users/${username}`);
        
        // Set user as online
        setUserOnlineStatus(true);
        
        // Set offline on disconnect
        currentUserRef.onDisconnect().update({ online: false });
        
        loginScreen.classList.add('hidden');
        chatApp.classList.remove('hidden');
        
        // Load users list
        updateUsersList();
    }
});

leaveChatBtn.addEventListener('click', () => {
    if (messagesRef) {
        messagesRef.off();
    }
    database.ref('users').off();
    setUserOnlineStatus(false);
    chatApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    usernameInput.value = '';
    currentUsername = '';
    selectedUser = null;
});

sendMessageBtn.addEventListener('click', () => {
    sendMessage(messageInput.value);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(messageInput.value);
    }
});

userSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const userItems = usersList.getElementsByClassName('user-item');
    
    Array.from(userItems).forEach(item => {
        const username = item.dataset.username.toLowerCase();
        item.style.display = username.includes(searchTerm) ? '' : 'none';
    });
});

messageInput.addEventListener('input', () => {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    updateTypingStatus(true);
    typingTimeout = setTimeout(() => updateTypingStatus(false), 3000);
});

themeToggle.addEventListener('click', toggleTheme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme === 'system') {
        updateThemeIcon();
    }
});

// Initialize notification permission
requestNotificationPermission();

// Handle page visibility
document.addEventListener('visibilitychange', () => {
    if (currentUsername) {
        setUserOnlineStatus(!document.hidden);
    }
}); 
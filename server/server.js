const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for this example
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// --- IN-MEMORY DATA ---
let users = [];
let globalMessages = [];
let privateMessages = {}; // Key: sorted user IDs, Value: array of messages

const createMessage = (senderId, recipientId, text, senderUsername) => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    senderId,
    recipientId,
    text,
    timestamp: Date.now(),
    senderUsername,
    readBy: [],
    reactions: {},
});

const getPrivateChatKey = (userId1, userId2) => {
    return [userId1, userId2].sort().join('-');
};

const findMessage = (messageId) => {
    let message = globalMessages.find(m => m.id === messageId);
    if (message) return { message, scope: 'global' };

    for (const key in privateMessages) {
        message = privateMessages[key].find(m => m.id === messageId);
        if (message) return { message, scope: key };
    }

    return { message: null, scope: null };
};

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('login', ({ username, gender, age }) => {
        const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (existingUser) {
            socket.emit('loginError', 'This username is already taken.');
            return;
        }
        
        const currentUser = {
            id: `user-${Date.now()}`,
            username,
            gender,
            age,
            isOnline: true,
            socketId: socket.id,
        };
        users.push(currentUser);
        
        socket.userId = currentUser.id;

        // Join the global room
        socket.join('global');

        const userPrivateMessages = {};
        Object.keys(privateMessages).forEach(key => {
            if (key.includes(currentUser.id)) {
                const partnerId = key.replace(currentUser.id, '').replace('-', '');
                userPrivateMessages[partnerId] = privateMessages[key];
            }
        });

        socket.emit('loginSuccess', {
            currentUser,
            users,
            globalMessages,
            privateMessages: userPrivateMessages,
        });
        
        io.emit('usersUpdate', users);
        console.log(`User logged in: ${currentUser.username} (${currentUser.id})`);
    });

    socket.on('sendMessage', ({ text, recipientId }) => {
        if (!socket.userId) return;

        const sender = users.find(u => u.id === socket.userId);
        if (!sender) return;

        const message = createMessage(sender.id, recipientId, text, sender.username);

        if (recipientId === 'global') { // It's a global message
            globalMessages.push(message);
            // Broadcast to everyone in the global room, including the sender.
            io.to('global').emit('newMessage', message);
        } else { // It's a private message
            const recipient = users.find(u => u.id === recipientId);
            if (recipient) {
                const chatKey = getPrivateChatKey(sender.id, recipientId);
                if (!privateMessages[chatKey]) {
                    privateMessages[chatKey] = [];
                }
                privateMessages[chatKey].push(message);
                
                // Emit to recipient if they are online
                if(recipient.socketId) {
                    io.to(recipient.socketId).emit('newMessage', message);
                }
                // Emit back to sender
                socket.emit('newMessage', message);
            }
        }
    });

    socket.on('editMessage', ({ messageId, newText }) => {
        if (!socket.userId) return;

        const { message: messageToEdit } = findMessage(messageId);

        if (!messageToEdit) return;

        // Security check: only the sender can edit
        if (messageToEdit.senderId !== socket.userId) return;

        // Update the message
        messageToEdit.text = newText;
        messageToEdit.isEdited = true;

        console.log(`Message ${messageId} edited by ${socket.userId}`);

        // Broadcast the updated message
        if (messageToEdit.recipientId === 'global') {
            io.to('global').emit('messageEdited', messageToEdit);
        } else {
            // Private message: notify both sender and recipient
            const sender = users.find(u => u.id === messageToEdit.senderId);
            const recipient = users.find(u => u.id === messageToEdit.recipientId);

            if (sender && sender.socketId) {
                io.to(sender.socketId).emit('messageEdited', messageToEdit);
            }
            if (recipient && recipient.socketId) {
                io.to(recipient.socketId).emit('messageEdited', messageToEdit);
            }
        }
    });

    socket.on('markAsRead', ({ messageId }) => {
        if (!socket.userId) return;

        const { message: messageToUpdate } = findMessage(messageId);
        
        if (!messageToUpdate) return;
        
        // Don't mark own messages as read or re-mark as read
        if (messageToUpdate.senderId === socket.userId || messageToUpdate.readBy.includes(socket.userId)) {
            return;
        }

        messageToUpdate.readBy.push(socket.userId);

        const sender = users.find(u => u.id === messageToUpdate.senderId);

        // Notify only the original sender that their message has been read
        if (sender && sender.socketId) {
            io.to(sender.socketId).emit('messageReadUpdate', messageToUpdate);
        }
    });

    socket.on('toggleReaction', ({ messageId, emoji }) => {
        if (!socket.userId) return;

        const { message: messageToUpdate } = findMessage(messageId);
        if (!messageToUpdate) return;
        
        const reactorId = socket.userId;
        const reactions = messageToUpdate.reactions || {};
        
        // Ensure the emoji key exists
        if (!reactions[emoji]) {
            reactions[emoji] = [];
        }

        const userIndex = reactions[emoji].indexOf(reactorId);

        if (userIndex > -1) {
            // User has already reacted with this emoji, so remove reaction
            reactions[emoji].splice(userIndex, 1);
            // If no one is reacting with this emoji anymore, remove it
            if (reactions[emoji].length === 0) {
                delete reactions[emoji];
            }
        } else {
            // User has not reacted, so add reaction
            reactions[emoji].push(reactorId);
        }

        messageToUpdate.reactions = reactions;

        // Broadcast the update
        if (messageToUpdate.recipientId === 'global') {
            io.to('global').emit('messageReactionUpdate', messageToUpdate);
        } else {
            const sender = users.find(u => u.id === messageToUpdate.senderId);
            const recipient = users.find(u => u.id === messageToUpdate.recipientId);

            if (sender && sender.socketId) {
                io.to(sender.socketId).emit('messageReactionUpdate', messageToUpdate);
            }
            if (recipient && recipient.socketId) {
                io.to(recipient.socketId).emit('messageReactionUpdate', messageToUpdate);
            }
        }
    });


    socket.on('startTyping', ({ chatId }) => {
        const sender = users.find(u => u.id === socket.userId);
        if (!sender) return;

        const payload = { chatId, username: sender.username };
        
        if (chatId === 'global') {
            socket.broadcast.to('global').emit('typingStarted', payload);
        } else {
            const recipient = users.find(u => u.id === chatId);
            if (recipient && recipient.socketId) {
                io.to(recipient.socketId).emit('typingStarted', payload);
            }
        }
    });

    socket.on('stopTyping', ({ chatId }) => {
        const sender = users.find(u => u.id === socket.userId);
        if (!sender) return;

        const payload = { chatId, username: sender.username };

        if (chatId === 'global') {
            socket.broadcast.to('global').emit('typingStopped', payload);
        } else {
            const recipient = users.find(u => u.id === chatId);
            if (recipient && recipient.socketId) {
                io.to(recipient.socketId).emit('typingStopped', payload);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const userIndex = users.findIndex(u => u.socketId === socket.id);

        if (userIndex > -1) {
            const user = users[userIndex];
            users.splice(userIndex, 1);
            console.log(`User removed: ${user.username}`);
            io.emit('usersUpdate', users);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on *:${PORT}`);
});
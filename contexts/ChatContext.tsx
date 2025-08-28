import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { User, Message, ChatContextType, ActiveChat } from '../types';

// The 'io' function is globally available from the script tag in index.html
// @ts-ignore
const socket = io("https://nexuschat-7bqr.onrender.com", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// --- STATE & REDUCER ---
type State = {
    currentUser: User | null;
    users: User[];
    globalMessages: Message[];
    privateMessages: Record<string, Message[]>;
    activeChat: ActiveChat;
    isConnected: boolean;
    typingUsers: Record<string, string[]>;
    unreadCounts: Record<string, number>;
};

type Action =
    | { type: 'LOGIN_SUCCESS'; payload: { currentUser: User; users: User[]; globalMessages: Message[]; privateMessages: Record<string, Message[]> } }
    | { type: 'LOGOUT' }
    | { type: 'SET_ACTIVE_CHAT'; payload: ActiveChat }
    | { type: 'ADD_MESSAGE'; payload: Message }
    | { type: 'MESSAGE_EDITED'; payload: Message }
    | { type: 'MESSAGE_READ_UPDATE'; payload: Message }
    | { type: 'MESSAGE_REACTION_UPDATE'; payload: Message }
    | { type: 'SET_USERS'; payload: User[] }
    | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
    | { type: 'TYPING_STARTED'; payload: { chatId: string; username: string } }
    | { type: 'TYPING_STOPPED'; payload: { chatId: string; username: string } };

const initialState: State = {
    currentUser: null,
    users: [],
    globalMessages: [],
    privateMessages: {},
    activeChat: null,
    isConnected: false,
    typingUsers: {},
    unreadCounts: {},
};

const chatReducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                isConnected: true,
                currentUser: action.payload.currentUser,
                users: action.payload.users,
                globalMessages: action.payload.globalMessages,
                privateMessages: action.payload.privateMessages,
                activeChat: { type: 'global' }, // Default to global chat on login
            };
        case 'LOGOUT':
            return { ...initialState, isConnected: state.isConnected };
        case 'SET_ACTIVE_CHAT': {
            const chat = action.payload;
            const newUnreadCounts = { ...state.unreadCounts };

            const chatId = chat?.type === 'global' ? 'global' : chat?.userId;
            if (chatId) {
                delete newUnreadCounts[chatId];
            }

            return { ...state, activeChat: chat, typingUsers: {}, unreadCounts: newUnreadCounts };
        }
        case 'ADD_MESSAGE': {
            const msg = action.payload;
            // Global Message
            if (msg.recipientId === 'global') {
                if (state.globalMessages.some(m => m.id === msg.id)) return state; // Avoid duplicates

                const isChatActive = state.activeChat?.type === 'global';
                const newUnreadCounts = { ...state.unreadCounts };
                if (!isChatActive && msg.senderId !== state.currentUser?.id) {
                    newUnreadCounts['global'] = (newUnreadCounts['global'] || 0) + 1;
                }

                return { ...state, globalMessages: [...state.globalMessages, msg], unreadCounts: newUnreadCounts };
            }
            // Private Message
            else {
                const partnerId = msg.senderId === state.currentUser?.id ? msg.recipientId : msg.senderId;
                const newPrivateMessages = { ...state.privateMessages };
                const partnerMessages = newPrivateMessages[partnerId] || [];
                if (partnerMessages.some(m => m.id === msg.id)) return state; // Avoid duplicates
                newPrivateMessages[partnerId] = [...partnerMessages, msg];

                const isChatActive = state.activeChat?.type === 'private' && state.activeChat.userId === partnerId;
                const newUnreadCounts = { ...state.unreadCounts };
                if (!isChatActive && msg.senderId !== state.currentUser?.id) {
                    newUnreadCounts[partnerId] = (newUnreadCounts[partnerId] || 0) + 1;
                }

                return { ...state, privateMessages: newPrivateMessages, unreadCounts: newUnreadCounts };
            }
        }
        case 'MESSAGE_EDITED':
        case 'MESSAGE_READ_UPDATE':
        case 'MESSAGE_REACTION_UPDATE': {
            const updatedMsg = action.payload;
            // Global Message
            if (updatedMsg.recipientId === 'global') {
                return {
                    ...state,
                    globalMessages: state.globalMessages.map(m => m.id === updatedMsg.id ? updatedMsg : m),
                };
            }
            // Private Message
            else {
                const partnerId = updatedMsg.senderId === state.currentUser?.id ? updatedMsg.recipientId : updatedMsg.senderId;
                const newPrivateMessages = { ...state.privateMessages };
                const partnerMessages = newPrivateMessages[partnerId] || [];
                newPrivateMessages[partnerId] = partnerMessages.map(m => m.id === updatedMsg.id ? updatedMsg : m);
                return { ...state, privateMessages: newPrivateMessages };
            }
        }
        case 'SET_USERS':
            return { ...state, users: action.payload };
        case 'SET_CONNECTION_STATUS':
            return { ...state, isConnected: action.payload };
        case 'TYPING_STARTED': {
            const { chatId, username } = action.payload;
            const currentTypists = state.typingUsers[chatId] || [];
            if (currentTypists.includes(username)) return state; // Already typing
            return {
                ...state,
                typingUsers: { ...state.typingUsers, [chatId]: [...currentTypists, username] },
            };
        }
        case 'TYPING_STOPPED': {
            const { chatId, username } = action.payload;
            const currentTypists = state.typingUsers[chatId] || [];
            return {
                ...state,
                typingUsers: {
                    ...state.typingUsers,
                    [chatId]: currentTypists.filter(u => u !== username),
                },
            };
        }
        default:
            return state;
    }
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // --- NOTIFICATION LOGIC ---
    const playNotificationSound = useCallback(() => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.error("Could not play notification sound.", e);
        }
    }, []);

    // Effect for handling dynamic page title based on unread counts
    useEffect(() => {
        const totalUnread = Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0);
        if (document.visibilityState === 'hidden' && totalUnread > 0) {
            document.title = `(${totalUnread}) Nexus Chat`;
        }
    }, [state.unreadCounts]);

    // Effect to reset title when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                document.title = 'Nexus Chat';
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);


    // --- SOCKET LOGIC ---
    useEffect(() => {
        socket.connect();

        const handleConnect = () => dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        const handleDisconnect = () => dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });

        const handleNewMessage = (message: Message) => {
            const { currentUser, activeChat } = stateRef.current;

            if (!currentUser) {
                dispatch({ type: 'ADD_MESSAGE', payload: message });
                return;
            }

            const isMyMessage = message.senderId === currentUser.id;

            let isChatActive = false;
            if (activeChat) {
                if (message.recipientId === 'global') {
                    isChatActive = activeChat.type === 'global';
                } else {
                    const partnerId = message.senderId === currentUser.id ? message.recipientId : message.senderId;
                    isChatActive = activeChat.type === 'private' && activeChat.userId === partnerId;
                }
            }

            if (!isMyMessage && !isChatActive && document.visibilityState === 'hidden') {
                playNotificationSound();
            }

            dispatch({ type: 'ADD_MESSAGE', payload: message });
        };

        const handleMessageEdited = (message: Message) => dispatch({ type: 'MESSAGE_EDITED', payload: message });
        const handleMessageReadUpdate = (message: Message) => dispatch({ type: 'MESSAGE_READ_UPDATE', payload: message });
        const handleMessageReactionUpdate = (message: Message) => dispatch({ type: 'MESSAGE_REACTION_UPDATE', payload: message });
        const handleUsersUpdate = (users: User[]) => dispatch({ type: 'SET_USERS', payload: users });
        const handleTypingStarted = (data: { chatId: string, username: string }) => dispatch({ type: 'TYPING_STARTED', payload: data });
        const handleTypingStopped = (data: { chatId: string, username: string }) => dispatch({ type: 'TYPING_STOPPED', payload: data });

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('newMessage', handleNewMessage);
        socket.on('messageEdited', handleMessageEdited);
        socket.on('messageReadUpdate', handleMessageReadUpdate);
        socket.on('messageReactionUpdate', handleMessageReactionUpdate);
        socket.on('usersUpdate', handleUsersUpdate);
        socket.on('typingStarted', handleTypingStarted);
        socket.on('typingStopped', handleTypingStopped);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('newMessage', handleNewMessage);
            socket.off('messageEdited', handleMessageEdited);
            socket.off('messageReadUpdate', handleMessageReadUpdate);
            socket.off('messageReactionUpdate', handleMessageReactionUpdate);
            socket.off('usersUpdate', handleUsersUpdate);
            socket.off('typingStarted', handleTypingStarted);
            socket.off('typingStopped', handleTypingStopped);
            socket.disconnect();
        };
    }, [playNotificationSound]);

    const login = useCallback((username: string, gender: 'Male' | 'Female' | 'Other', age: number): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!socket.connected) {
                socket.connect();
            }

            socket.once('loginSuccess', (data: any) => {
                dispatch({ type: 'LOGIN_SUCCESS', payload: data });
                socket.off('loginError'); // Clean up error listener
                resolve();
            });

            socket.once('loginError', (error: string) => {
                socket.off('loginSuccess'); // Clean up success listener
                reject(new Error(error));
            });

            socket.emit('login', { username, gender, age });
        });
    }, []);

    const logout = useCallback(() => {
        if (socket.connected) {
            socket.disconnect();
        }
        dispatch({ type: 'LOGOUT' });
        dispatch({ type: 'SET_ACTIVE_CHAT', payload: null });
    }, []);

    const sendMessage = useCallback((text: string) => {
        if (!state.currentUser || !socket.connected || !state.activeChat) return;

        const recipientId = state.activeChat.type === 'global' ? 'global' : state.activeChat.userId;
        socket.emit('sendMessage', { text, recipientId });
    }, [state.currentUser, state.activeChat]);

    const setActiveChat = useCallback((chat: ActiveChat) => {
        dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat });
    }, []);

    const startTyping = useCallback(() => {
        if (!socket.connected || !state.activeChat) return;
        const chatId = state.activeChat.type === 'global' ? 'global' : state.activeChat.userId;
        socket.emit('startTyping', { chatId });
    }, [state.activeChat]);

    const stopTyping = useCallback(() => {
        if (!socket.connected || !state.activeChat) return;
        const chatId = state.activeChat.type === 'global' ? 'global' : state.activeChat.userId;
        socket.emit('stopTyping', { chatId });
    }, [state.activeChat]);

    const editMessage = useCallback((messageId: string, newText: string) => {
        if (!socket.connected) return;
        socket.emit('editMessage', { messageId, newText });
    }, []);

    const markMessageAsRead = useCallback((messageId: string) => {
        if (!socket.connected) return;
        socket.emit('markAsRead', { messageId });
    }, []);

    const toggleReaction = useCallback((messageId: string, emoji: string) => {
        if (!socket.connected) return;
        socket.emit('toggleReaction', { messageId, emoji });
    }, []);

    const value: ChatContextType = {
        currentUser: state.currentUser,
        users: state.users,
        globalMessages: state.globalMessages,
        privateMessages: state.privateMessages,
        activeChat: state.activeChat,
        typingUsers: state.typingUsers,
        unreadCounts: state.unreadCounts,
        login,
        logout,
        sendMessage,
        setActiveChat,
        startTyping,
        stopTyping,
        editMessage,
        markMessageAsRead,
        toggleReaction,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import type { Message as MessageType, User } from '../types';
import Message from './Message';

const ChatHeader: React.FC<{ user: User | null, isGlobal: boolean }> = ({ user, isGlobal }) => {
    const headerInfo = user ? {
        name: user.username,
        avatarChar: user.username.charAt(0).toUpperCase(),
        details: `${user.gender}, ${user.age} - ${user.isOnline ? 'Online' : 'Offline'}`,
        isOnline: user.isOnline,
        isGroup: false,
    } : isGlobal ? {
        name: 'Global Chat',
        avatarChar: '#',
        details: 'Public channel for all users',
        isOnline: true, 
        isGroup: true,
    } : null;

    if (!headerInfo) return null;

    return (
        <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center space-x-3">
            <div className="relative">
                <div className={`w-10 h-10 rounded-full ${headerInfo.isGroup ? 'bg-cyan-600' : 'bg-gray-600'} flex items-center justify-center font-bold text-white`}>
                    {headerInfo.avatarChar}
                </div>
                {user && (
                     <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-gray-900 ${headerInfo.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                )}
            </div>
            <div>
                <h2 className="text-lg font-semibold">{headerInfo.name}</h2>
                <p className="text-sm text-gray-400">{headerInfo.details}</p>
            </div>
        </div>
    );
};

const ChatInput: React.FC<{ 
    onSend: (text: string) => void;
    startTyping: () => void;
    stopTyping: () => void; 
}> = ({ onSend, startTyping, stopTyping }) => {
    const [text, setText] = useState('');
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);

        if (!typingTimeoutRef.current) {
            startTyping();
        } else {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
            typingTimeoutRef.current = null;
        }, 1500);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSend(text.trim());
            setText('');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            stopTyping();
        }
    };

    return (
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
            <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                <input
                    type="text"
                    value={text}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" className="bg-cyan-600 text-white rounded-full p-3 hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M3.105 3.105a.5.5 0 01.707 0L19.5 18.293V13.5a.5.5 0 011 0v6a.5.5 0 01-.5.5h-6a.5.5 0 010-1h4.793L3.105 3.812a.5.5 0 010-.707z" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

const WelcomeScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center bg-gray-800 p-8">
         <h1 className="text-4xl font-bold text-cyan-400">Welcome to Nexus Chat</h1>
         <p className="mt-4 text-lg text-gray-400">
             Select the Global Chat or a user from the sidebar to start chatting.
         </p>
    </div>
);

const TypingIndicator: React.FC = () => {
    const { activeChat, typingUsers, currentUser } = useChat();

    if (!activeChat) return null;

    const chatId = activeChat.type === 'global' ? 'global' : activeChat.userId;
    const typistsInCurrentChat = (typingUsers[chatId] || []);
    const otherTypists = typistsInCurrentChat.filter(username => username !== currentUser?.username);

    if (otherTypists.length === 0) return null;

    const getTypingText = () => {
        const numTypists = otherTypists.length;
        if (numTypists === 1) {
            return `${otherTypists[0]} is typing...`;
        }
        if (numTypists === 2) {
            return `${otherTypists[0]} and ${otherTypists[1]} are typing...`;
        }
        // For 3 or more typists
        const othersCount = numTypists - 2;
        const otherText = othersCount > 1 ? 'others are' : 'other is';
        return `${otherTypists[0]}, ${otherTypists[1]} and ${othersCount} ${otherText} typing...`;
    };

    return (
        <div className="h-6 px-4 pb-1 text-sm text-gray-400 italic animate-pulse">
            {getTypingText()}
        </div>
    );
};


const ChatWindow: React.FC = () => {
    const { users, globalMessages, privateMessages, activeChat, currentUser, sendMessage, startTyping, stopTyping, editMessage, markMessageAsRead, toggleReaction } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const partner = activeChat?.type === 'private' ? users.find(u => u.id === activeChat.userId) ?? null : null;
    const messages = activeChat?.type === 'global' 
        ? (globalMessages || []) 
        : activeChat?.type === 'private' 
        ? (privateMessages[activeChat.userId] || []) 
        : [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!activeChat) {
        return <WelcomeScreen />;
    }

    return (
        <div className="flex flex-col h-full bg-gray-800">
            <ChatHeader user={partner} isGlobal={activeChat.type === 'global'} />
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <Message
                        key={msg.id}
                        message={msg}
                        isCurrentUser={msg.senderId === currentUser?.id}
                        currentUser={currentUser}
                        editMessage={editMessage}
                        markMessageAsRead={markMessageAsRead}
                        toggleReaction={toggleReaction}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <TypingIndicator />
            
            <ChatInput 
                onSend={sendMessage} 
                startTyping={startTyping}
                stopTyping={stopTyping}
            />
        </div>
    );
};

export default ChatWindow;

import React, { useState, useEffect, useRef } from 'react';
import type { Message, User } from '../types';

interface MessageProps {
    message: Message;
    isCurrentUser: boolean;
    currentUser: User | null;
    editMessage: (messageId: string, newText: string) => void;
    markMessageAsRead: (messageId: string) => void;
    toggleReaction: (messageId: string, emoji: string) => void;
}

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
);

const SentIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);
  
const ReadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 12.75-6-6-9 13.5" transform="translate(-5, 0)"/>
    </svg>
);

const ReactionIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm4.5 0c0 .414-.168.75-.375.75s-.375-.414-.375-.75.168-.75.375-.75.375.336.375.75Z" />
    </svg>
);
  
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😯', '😢', '🙏'];

const Message: React.FC<MessageProps> = ({ message, isCurrentUser, currentUser, editMessage, markMessageAsRead, toggleReaction }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Effect for handling auto-read on scroll into view
    useEffect(() => {
        if (!isCurrentUser && messageRef.current && currentUser) {
            const hasBeenReadByMe = message.readBy?.includes(currentUser.id);
            if(hasBeenReadByMe) return;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        markMessageAsRead(message.id);
                        observer.unobserve(entry.target);
                    }
                },
                { threshold: 0.8 }
            );

            observer.observe(messageRef.current);
            
            return () => observer.disconnect();
        }
    }, [message.id, isCurrentUser, markMessageAsRead, currentUser, message.readBy]);

    // Effect for focusing the edit input
    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
        }
    }, [isEditing]);

    // Close reaction picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowReactionPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSave = () => {
        if (editText.trim() && editText.trim() !== message.text) {
            editMessage(message.id, editText.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditText(message.text);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleReaction = (emoji: string) => {
        toggleReaction(message.id, emoji);
        setShowReactionPicker(false);
    }

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const alignment = isCurrentUser ? 'justify-end' : 'justify-start';
    const bubbleColor = isCurrentUser ? 'bg-cyan-600' : 'bg-gray-700';
    const textColor = 'text-white';
    const borderRadius = isCurrentUser ? 'rounded-br-none' : 'rounded-bl-none';

    const isRead = message.readBy && message.readBy.length > 0;

    return (
        <div className={`flex ${alignment}`} ref={messageRef}>
            <div className="flex items-end max-w-xs md:max-w-md lg:max-w-lg group relative">
                 {!isCurrentUser && (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0 mr-2">
                         {message.senderUsername.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="w-full">
                    {/* Meta info: username and timestamp */}
                    <div className={`flex items-center space-x-2 text-xs mb-1 px-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {!isCurrentUser && (
                            <p className="text-gray-400 font-semibold">{message.senderUsername}</p>
                        )}
                        <p className="text-gray-500">{formatTimestamp(message.timestamp)}</p>
                        {message.isEdited && <p className="text-gray-500 text-xs">(edited)</p>}
                        {isCurrentUser && (
                           isRead ? <ReadIcon className="w-4 h-4 text-cyan-400" /> : <SentIcon className="w-4 h-4 text-gray-500" />
                        )}
                    </div>
                    
                    {isEditing ? (
                        <div className="flex items-center space-x-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full px-3 py-2 text-sm bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <button onClick={handleSave} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 rounded">Save</button>
                            <button onClick={handleCancel} className="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 rounded">Cancel</button>
                        </div>
                    ) : (
                         <div className={`flex items-center ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="relative">
                                {/* Message bubble */}
                                <div className={`px-4 py-2 rounded-xl ${bubbleColor} ${textColor} ${borderRadius}`}>
                                    <p className="text-sm break-words">{message.text}</p>
                                </div>
                                {/* Reactions display */}
                                {message.reactions && Object.keys(message.reactions).length > 0 && (
                                    <div className={`absolute -bottom-4 flex space-x-1 ${isCurrentUser ? 'left-2' : 'left-2'}`}>
                                        {Object.entries(message.reactions).map(([emoji, userIds]) => {
                                            const hasReacted = currentUser && userIds.includes(currentUser.id);
                                            return (
                                                <button
                                                    key={emoji}
                                                    onClick={() => handleReaction(emoji)}
                                                    className={`px-1.5 py-0.5 text-xs rounded-full flex items-center space-x-1 transition-transform transform hover:scale-110 ${hasReacted ? 'bg-cyan-500 text-white' : 'bg-gray-600 text-gray-200'}`}
                                                >
                                                    <span>{emoji}</span>
                                                    <span>{userIds.length}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            
                            {/* Action buttons */}
                            <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-opacity mx-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                <button
                                    onClick={() => setShowReactionPicker(prev => !prev)}
                                    className="p-1 text-gray-500 hover:text-white"
                                    aria-label="Add reaction"
                                >
                                    <ReactionIcon className="w-4 h-4" />
                                </button>
                                {isCurrentUser && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1 text-gray-500 hover:text-white"
                                        aria-label="Edit message"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                         </div>
                    )}
                </div>
                 {/* Reaction Picker Popover */}
                 {showReactionPicker && (
                    <div ref={pickerRef} className={`absolute z-10 p-1 bg-gray-800 rounded-full shadow-lg flex items-center space-x-1 ${isCurrentUser ? '-top-8 right-0' : '-top-8 left-8'}`}>
                        {REACTION_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className="p-1 text-xl hover:scale-125 transition-transform"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Message;

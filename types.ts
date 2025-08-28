export interface User {
    id: string;
    username: string;
    gender: 'Male' | 'Female' | 'Other';
    age: number;
    isOnline: boolean;
}

export interface Message {
    id: string;
    senderId: string;
    recipientId: string; // 'global' or User ID
    text: string;
    timestamp: number;
    senderUsername: string;
    isEdited?: boolean;
    readBy?: string[]; // Array of user IDs who have read the message
    reactions?: Record<string, string[]>; // e.g., { '👍': ['userId1', 'userId2'] }
}

export type ActiveChat = { type: 'global' } | { type: 'private'; userId: string } | null;

export type ChatContextType = {
    currentUser: User | null;
    users: User[];
    globalMessages: Message[];
    privateMessages: Record<string, Message[]>;
    activeChat: ActiveChat;
    typingUsers: Record<string, string[]>; // Key: chatId, Value: array of usernames
    unreadCounts: Record<string, number>; // Key: chatId, Value: count of unread messages
    login: (username: string, gender: 'Male' | 'Female' | 'Other', age: number) => Promise<void>;
    logout: () => void;
    sendMessage: (text: string) => void;
    setActiveChat: (chat: ActiveChat) => void;
    startTyping: () => void;
    stopTyping: () => void;
    editMessage: (messageId: string, newText: string) => void;
    markMessageAsRead: (messageId: string) => void;
    toggleReaction: (messageId: string, emoji: string) => void;
};
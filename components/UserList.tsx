import React, { useState, useMemo } from 'react';
import { useChat } from '../contexts/ChatContext';
import type { User } from '../types';

const UserProfile: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
    <div className="p-4 bg-gray-900/50">
        <h3 className="text-xl font-semibold text-white">{user.username}</h3>
        <p className="text-sm text-gray-400">{user.gender}, {user.age}</p>
        <button
            onClick={onLogout}
            className="mt-3 w-full text-center py-2 px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
            Logout
        </button>
    </div>
);

const UserListItem: React.FC<{ user: User; onClick: () => void; isSelected: boolean; unreadCount: number }> = ({ user, onClick, isSelected, unreadCount }) => (
    <li
        onClick={onClick}
        className={`flex items-center justify-between p-3 cursor-pointer rounded-lg mx-2 my-1 transition-colors ${isSelected ? 'bg-cyan-800/50' : 'hover:bg-gray-700'}`}
    >
        <div className="flex items-center min-w-0">
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                </div>
            </div>
            <div className="ml-3 min-w-0">
                <div className="flex items-center space-x-2">
                    <p className="font-semibold text-white truncate">{user.username}</p>
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${user.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                </div>
            </div>
        </div>
        {unreadCount > 0 && (
             <span className="ml-2 bg-cyan-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        )}
    </li>
);

const GlobalChatListItem: React.FC<{ onClick: () => void; isSelected: boolean; unreadCount: number }> = ({ onClick, isSelected, unreadCount }) => (
    <li
        onClick={onClick}
        className={`flex items-center justify-between p-3 cursor-pointer rounded-lg mx-2 my-1 transition-colors ${isSelected ? 'bg-cyan-800/50' : 'hover:bg-gray-700'}`}
    >
        <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-white">#</div>
            <div className="ml-3">
                <p className="font-semibold text-white">Global Chat</p>
            </div>
        </div>
        {unreadCount > 0 && (
            <span className="ml-2 bg-cyan-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        )}
    </li>
);


interface UserListProps {
    onUserSelect: () => void;
}

const UserList: React.FC<UserListProps> = ({ onUserSelect }) => {
    const { currentUser, users, logout, activeChat, setActiveChat, unreadCounts } = useChat();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        return (users || [])
            .filter(user => user.id !== currentUser?.id)
            .filter(user => user.username.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => (b.isOnline ? 1 : -1) - (a.isOnline ? 1 : -1) || a.username.localeCompare(b.username));
    }, [users, currentUser, searchTerm]);
    
    if (!currentUser) return null;

    return (
        <div className="flex flex-col h-full bg-gray-800 border-r border-gray-700">
            <UserProfile user={currentUser} onLogout={logout} />
            
            <div className="p-2 border-y border-gray-700">
                <input
                    type="text"
                    placeholder='Search users...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <ul className="py-2">
                    <GlobalChatListItem
                        onClick={() => { setActiveChat({ type: 'global' }); onUserSelect(); }}
                        isSelected={activeChat?.type === 'global'}
                        unreadCount={unreadCounts['global'] || 0}
                    />
                     {filteredUsers.map(user => (
                        <UserListItem
                            key={user.id}
                            user={user}
                            onClick={() => { setActiveChat({ type: 'private', userId: user.id }); onUserSelect(); }}
                            isSelected={activeChat?.type === 'private' && activeChat.userId === user.id}
                            unreadCount={unreadCounts[user.id] || 0}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default UserList;
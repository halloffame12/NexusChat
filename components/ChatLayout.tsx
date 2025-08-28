
import React, { useState } from 'react';
import UserList from './UserList';
import ChatWindow from './ChatWindow';
import { useChat } from '../contexts/ChatContext';

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);


const ChatLayout: React.FC = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { activeChat } = useChat();

    const handleUserSelect = () => {
        setSidebarOpen(false); // Close sidebar on mobile when a user is selected
    }

    const getChatTitle = () => {
        if (!activeChat) return 'Nexus Chat';
        if (activeChat.type === 'global') return 'Global Chat';
        return 'Private Chat';
    }

    return (
        <div className="flex h-screen w-screen bg-gray-800 text-gray-200">
            {/* Sidebar for desktop */}
            <div className="hidden md:flex md:flex-shrink-0">
                <div className="flex flex-col w-64 lg:w-80">
                    <UserList onUserSelect={handleUserSelect} />
                </div>
            </div>

            {/* Mobile Sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden" onClick={() => setSidebarOpen(false)}>
                    <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 z-40" onClick={(e) => e.stopPropagation()}>
                        <UserList onUserSelect={handleUserSelect} />
                    </div>
                </div>
            )}
            
            <div className="flex flex-col flex-1 min-w-0">
                 {/* Mobile Header */}
                <header className="flex md:hidden items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white">
                        <MenuIcon className="h-6 w-6" />
                    </button>
                     {/* Dynamic title for mobile */}
                    <div className="font-semibold text-lg">
                        {getChatTitle()}
                    </div>
                    <div className="w-8"></div> {/* Spacer */}
                </header>
                <ChatWindow />
            </div>
        </div>
    );
};

export default ChatLayout;
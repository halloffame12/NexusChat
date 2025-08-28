
import React from 'react';
import { ChatProvider, useChat } from './contexts/ChatContext';
import LoginScreen from './components/LoginScreen';
import ChatLayout from './components/ChatLayout';

const AppContent: React.FC = () => {
    const { currentUser } = useChat();

    return (
        <div className="h-screen w-screen bg-gray-900 text-gray-100 font-sans">
            {currentUser ? <ChatLayout /> : <LoginScreen />}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ChatProvider>
            <AppContent />
        </ChatProvider>
    );
};

export default App;

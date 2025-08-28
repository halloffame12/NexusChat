import React, { useState } from 'react';
import { useChat } from '../contexts/ChatContext';

const LoginScreen: React.FC = () => {
    const [username, setUsername] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Other');
    const [age, setAge] = useState<number>(18);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useChat();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim().length < 3) {
            setError('Username must be at least 3 characters long.');
            return;
        }
        if (age < 13) {
            setError('You must be at least 13 years old.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await login(username, gender, age);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred during login.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-900 to-slate-800">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-cyan-400">Nexus Chat</h1>
                    <p className="mt-2 text-gray-400">Create a temporary profile to join</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center">{error}</p>}
                    <div>
                        <label htmlFor="username" className="text-sm font-medium text-gray-300">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                            placeholder="e.g., Neo"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="gender" className="text-sm font-medium text-gray-300">Gender</label>
                        <select
                            id="gender"
                            value={gender}
                            onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                            className="mt-1 block w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                            disabled={isLoading}
                        >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="age" className="text-sm font-medium text-gray-300">Age: {age}</label>
                        <input
                            id="age"
                            type="range"
                            min="13"
                            max="99"
                            value={age}
                            onChange={(e) => setAge(parseInt(e.target.value, 10))}
                            className="mt-1 w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 text-lg font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-500 focus:ring-opacity-50 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? 'Joining...' : 'Join Chat'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;

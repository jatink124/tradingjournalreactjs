'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from './context/GlobalContext';

export default function LoginPage() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const { login, isAuthenticated } = useGlobal();

    useEffect(() => {
        if (isAuthenticated) router.push('/dashboard');
    }, [isAuthenticated, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (login(pin)) {
            router.push('/dashboard');
        } else {
            setError('Invalid Access PIN');
            setPin('');
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]"></div>

            <div className="z-10 bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">TRADEX</h1>
                    <p className="text-slate-400 text-sm mt-2">Professional Trading Journal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Access PIN</label>
                        <input 
                            type="password" 
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] text-xl focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="••••"
                            maxLength={4}
                            autoFocus
                        />
                    </div>
                    
                    {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded">{error}</div>}

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-600/20">
                        ENTER JOURNAL
                    </button>
                </form>
            </div>
        </div>
    );
}
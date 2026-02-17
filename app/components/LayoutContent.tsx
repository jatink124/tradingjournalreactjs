'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { CompoundingCalculator } from './CompoundingCalculator';
import { useGlobal } from '../context/GlobalContext';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { showCalculator, setShowCalculator, calcEntries, setCalcEntries, isAuthenticated, theme } = useGlobal();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isLoginPage = pathname === '/';

    return (
        <div data-theme={theme} className="flex h-screen w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden transition-colors duration-300">
            
            {/* MOBILE SIDEBAR OVERLAY */}
            {isAuthenticated && !isLoginPage && (
                <>
                    <div 
                        className={`fixed inset-0 bg-black/80 z-40 transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div className={`fixed top-0 left-0 bottom-0 w-64 bg-[var(--background)] border-r border-[var(--card-border)] z-50 transform transition-transform duration-300 md:translate-x-0 md:static md:flex ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                         <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
                    </div>
                </>
            )}

            <main className="flex-1 h-full overflow-hidden flex flex-col relative w-full">
                 {/* MOBILE HEADER */}
                {isAuthenticated && !isLoginPage && (
                    <div className="md:hidden h-14 bg-[var(--background)] border-b border-[var(--card-border)] flex items-center px-4 justify-between shrink-0">
                         <button onClick={() => setIsMobileMenuOpen(true)} className="text-[var(--muted)] p-2 hover:text-[var(--foreground)]">
                            <i className="fas fa-bars text-lg"></i>
                         </button>
                         <span className="font-bold text-[var(--foreground)] tracking-tight">TRADEX</span>
                         <div className="w-8"></div>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
                    {children}
                </div>
            </main>

            <CompoundingCalculator 
                isOpen={showCalculator} 
                onClose={() => setShowCalculator(false)}
                entries={calcEntries}
                setEntries={setCalcEntries}
            />
        </div>
    );
}
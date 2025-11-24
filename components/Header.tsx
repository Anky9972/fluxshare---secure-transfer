import React, { useState } from 'react';
import { Shield, Menu, X, Github, Activity } from 'lucide-react';
import DocsModal from './DocsModal';
import StatusModal from './StatusModal';

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [showStatus, setShowStatus] = useState(false);

    return (
        <>
            <DocsModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
            <StatusModal isOpen={showStatus} onClose={() => setShowStatus(false)} />
            <header className="fixed top-0 left-0 w-full z-50 bg-[#050510]/80 backdrop-blur-md border-b border-[#222]">
                <div className="max-w-[1600px] mx-auto px-4 md:px-12 h-20 flex items-center justify-between">

                    {/* Logo Area */}
                    {/* Logo Area */}
                    {/* Logo Area */}
                    <div className="flex items-center gap-3 group cursor-pointer active:scale-95 transition-transform duration-100">
                        <div className="flex flex-col">
                            <h1 className="font-display text-5xl font-bold tracking-wider leading-none text-white flex items-center">
                                <span className="glitch" data-text="FLUX">FLUX</span>
                                <span className="glitch text-[#bc13fe]" data-text="SHARE">SHARE</span>
                            </h1>
                            <span className="font-mono text-[10px] text-[#00f3ff] tracking-[0.3em] opacity-70 group-hover:opacity-100 transition-opacity">SECURE TRANSFER PROTOCOL</span>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00f3ff]/5 border border-[#00f3ff]/20 hover:bg-[#00f3ff]/10 transition-colors cursor-default">
                            <div className="w-2 h-2 rounded-full bg-[#00f3ff] animate-pulse"></div>
                            <span className="font-mono text-xs text-[#00f3ff]">NETWORK_ONLINE</span>
                        </div>

                        <a href="#" onClick={(e) => { e.preventDefault(); setShowDocs(true); }} className="font-mono text-sm text-gray-400 hover:text-white transition-colors hover:animate-pulse">DOCS</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowStatus(true); }} className="font-mono text-sm text-gray-400 hover:text-white transition-colors hover:animate-pulse">STATUS</a>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-white p-2"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Navigation Overlay */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-20 left-0 w-full bg-[#050510] border-b border-[#222] p-4 flex flex-col gap-4 animate-fadeIn">
                        <div className="flex items-center justify-between px-4 py-3 rounded bg-[#00f3ff]/5 border border-[#00f3ff]/20">
                            <span className="font-mono text-sm text-[#00f3ff]">NETWORK STATUS</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#00f3ff] animate-pulse"></div>
                                <span className="font-mono text-xs text-[#00f3ff]">ONLINE</span>
                            </div>
                        </div>

                        <a href="#" onClick={(e) => { e.preventDefault(); setShowDocs(true); setIsMenuOpen(false); }} className="block px-4 py-3 font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">DOCS</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setShowStatus(true); setIsMenuOpen(false); }} className="block px-4 py-3 font-mono text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">STATUS</a>
                    </div>
                )}
            </header>
        </>
    );
};

export default Header;


import React, { useState, useEffect } from 'react';
import { Shield, Radio, Cpu, Zap, Crosshair, Terminal, Activity } from 'lucide-react';
import SFTPManager from './components/SFTPManager';
import P2PShare from './components/P2PShare';

enum Tab {
  SFTP = 'SFTP',
  P2P = 'P2P'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SFTP);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);

  // Physics Parallax Effect & Scroll Listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 20 - 10,
        y: (e.clientY / window.innerHeight) * 20 - 10
      });
    };
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050510] text-[#e0e0ff]">
      {/* Global Noise Overlay */}
      <div className="noise-overlay"></div>

      {/* Dynamic Background Grid (Parallax) */}
      <div 
        className="fixed inset-[-10%] w-[120%] h-[120%] opacity-15 pointer-events-none"
        style={{
          transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)`,
          backgroundImage: `
            linear-gradient(transparent 95%, #00f3ff 95%),
            linear-gradient(90deg, transparent 95%, #bc13fe 95%)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Header HUD - Increased Z-Index and Solid Backdrop */}
      <header 
        className={`
          fixed top-0 left-0 w-full z-[100] px-6 py-4 transition-all duration-300 border-b
          ${scrolled ? 'bg-[#050510]/95 backdrop-blur-xl border-[#00f3ff]/20 py-3 shadow-lg shadow-[#00f3ff]/5' : 'bg-transparent border-transparent py-6'}
        `}
      >
        <div className="flex justify-between items-center max-w-[1600px] mx-auto">
          <div className="flex flex-col group cursor-default">
            <div className="flex items-center gap-2">
              <Activity className="text-[#00f3ff] animate-pulse" size={24} />
              <h1 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-tighter text-white glitch" data-text="FLUXSHARE">
                FLUX<span className="text-[#00f3ff]">SHARE</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[#bc13fe] text-[10px] font-mono tracking-[0.3em] ml-1">
              <span>SECURE_DATA_PROTOCOL_V4</span>
            </div>
          </div>

          <div className="hidden md:flex gap-8 font-mono text-xs text-[#00f3ff]/60 tracking-wider">
            <div className="flex flex-col items-end border-r border-[#00f3ff]/20 pr-6">
              <span>SERVER_STATUS</span>
              <span className="text-[#00f3ff] font-bold">OPTIMAL</span>
            </div>
            <div className="flex flex-col items-end">
              <span>ENCRYPTION</span>
              <span className="text-[#bc13fe] font-bold">QUANTUM-4096</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 pt-40 px-4 md:px-12 max-w-[1600px] mx-auto pb-32">
        
        {/* Navigation Tabs */}
        <div className="flex justify-center md:justify-start gap-6 mb-12">
          <button
            onClick={() => setActiveTab(Tab.SFTP)}
            className={`
              relative px-8 py-3 font-display text-lg font-medium uppercase tracking-widest transition-all duration-300
              group overflow-hidden border
              ${activeTab === Tab.SFTP 
                ? 'bg-[#00f3ff]/10 border-[#00f3ff] text-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.2)]' 
                : 'bg-transparent border-[#333] text-gray-500 hover:text-white hover:border-white'}
            `}
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <Terminal size={18} />
              <span>Secure Node (SFTP)</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab(Tab.P2P)}
            className={`
              relative px-8 py-3 font-display text-lg font-medium uppercase tracking-widest transition-all duration-300
              group overflow-hidden border
              ${activeTab === Tab.P2P 
                ? 'bg-[#bc13fe]/10 border-[#bc13fe] text-[#bc13fe] shadow-[0_0_20px_rgba(188,19,254,0.2)]' 
                : 'bg-transparent border-[#333] text-gray-500 hover:text-white hover:border-white'}
            `}
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <Radio size={18} />
              <span>Quick Link (P2P)</span>
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div className="relative min-h-[60vh] animate-fadeIn">
            {activeTab === Tab.SFTP ? <SFTPManager /> : <P2PShare />}
        </div>

      </main>

      {/* Footer HUD */}
      <footer className="fixed bottom-0 w-full bg-[#050510]/80 backdrop-blur-md border-t border-[#222] py-2 px-6 z-[100] flex justify-between items-center text-[10px] text-gray-500 font-mono uppercase">
          <div className="flex gap-4">
             <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00f3ff] animate-pulse"></span> SYSTEM ONLINE</span>
             <span>FLUX_CORE_RUNNING</span>
          </div>
          <div className="flex items-center gap-2 text-[#bc13fe]">
             <Crosshair size={14} className="animate-spin-slow" />
             MONITORING_ACTIVE
          </div>
      </footer>
    </div>
  );
};

export default App;

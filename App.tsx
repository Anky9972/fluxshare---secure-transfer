
import React, { useState, useEffect } from 'react';
import { Shield, Radio, Cpu, Zap, Crosshair, Terminal, Activity, Users } from 'lucide-react';
import SFTPManager from './components/SFTPManager';
import P2PShare from './components/P2PShare';

import CommunicationHub from './components/CommunicationHub';
import BroadcastHub from './components/BroadcastHub';

enum Tab {
  SFTP = 'SFTP',
  P2P = 'P2P',
  COMMUNICATION = 'COMMUNICATION',
  BROADCAST = 'BROADCAST'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SFTP);
  // ... (rest of state)

  // ... (rest of effects)

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050510] text-[#e0e0ff]">
      {/* ... (Header and Background) */}

      {/* Main Container */}
      <main className="relative z-10 pt-40 px-4 md:px-12 max-w-[1600px] mx-auto pb-32">

        {/* Navigation Tabs */}
        <div className="flex justify-center md:justify-start gap-6 mb-12 flex-wrap">
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

          <button
            onClick={() => setActiveTab(Tab.COMMUNICATION)}
            className={`
              relative px-8 py-3 font-display text-lg font-medium uppercase tracking-widest transition-all duration-300
              group overflow-hidden border
              ${activeTab === Tab.COMMUNICATION
                ? 'bg-[#00ff9d]/10 border-[#00ff9d] text-[#00ff9d] shadow-[0_0_20px_rgba(0,255,157,0.2)]'
                : 'bg-transparent border-[#333] text-gray-500 hover:text-white hover:border-white'}
            `}
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <Users size={18} />
              <span>Comm Link</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab(Tab.BROADCAST)}
            className={`
              relative px-8 py-3 font-display text-lg font-medium uppercase tracking-widest transition-all duration-300
              group overflow-hidden border
              ${activeTab === Tab.BROADCAST
                ? 'bg-[#ff0055]/10 border-[#ff0055] text-[#ff0055] shadow-[0_0_20px_rgba(255,0,85,0.2)]'
                : 'bg-transparent border-[#333] text-gray-500 hover:text-white hover:border-white'}
            `}
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <div className="flex items-center gap-3 relative z-10">
              <Activity size={18} />
              <span>Broadcast</span>
            </div>
          </button>
        </div>

        {/* Content Area */}
        <div className="relative min-h-[60vh] animate-fadeIn">
          {activeTab === Tab.SFTP && <SFTPManager />}
          {activeTab === Tab.P2P && <P2PShare />}
          {activeTab === Tab.COMMUNICATION && <CommunicationHub />}
          {activeTab === Tab.BROADCAST && <BroadcastHub />}
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

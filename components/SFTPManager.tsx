
import React, { useState, useEffect, useRef } from 'react';
import { Server, HardDrive, Folder, FolderOpen, Download, Upload, Activity, Terminal, Copy, File as FileIcon, X, ArrowRight, Database, ChevronRight, Home, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { RemoteEntry, SFTPPacket } from '../types';

declare const Peer: any;
const CHUNK_SIZE = 16 * 1024; // 16KB chunks

type Mode = 'selection' | 'host' | 'client';

// Helper to keep track of handles on the host side
interface HandleMap {
  [path: string]: FileSystemHandle;
}

interface VirtualNode {
  name: string;
  kind: 'file' | 'directory';
  size?: number;
  children?: { [name: string]: VirtualNode };
}

// Helper for UUID generation
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const SFTPManager: React.FC = () => {
  const [mode, setMode] = useState<Mode>('selection');

  // --- HOST STATE ---
  const [hostId, setHostId] = useState<string>('');
  const [rootDirHandle, setRootDirHandle] = useState<FileSystemDirectoryHandle | { name: string } | null>(null);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [activeConnections, setActiveConnections] = useState<number>(0);

  // Host fallback state (for browsers without File System Access API)
  const [useNativeFS, setUseNativeFS] = useState(true);
  const [virtualFiles, setVirtualFiles] = useState<Map<string, File>>(new Map());
  const [virtualTree, setVirtualTree] = useState<VirtualNode>({ name: 'root', kind: 'directory', children: {} });
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  // --- REFS FOR EVENT LISTENERS (Fixes Stale Closure) ---
  const rootDirHandleRef = useRef<FileSystemDirectoryHandle | { name: string } | null>(null);
  const useNativeFSRef = useRef(true);
  const virtualFilesRef = useRef<Map<string, File>>(new Map());
  const virtualTreeRef = useRef<VirtualNode>({ name: 'root', kind: 'directory', children: {} });

  // --- CLIENT STATE ---
  const [targetHostId, setTargetHostId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [currentPath, setCurrentPath] = useState<string>('/'); // Virtual path
  const [remoteEntries, setRemoteEntries] = useState<RemoteEntry[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Refs
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<any[]>([]);
  const clientConnRef = useRef<any>(null);
  const downloadBufferRef = useRef<ArrayBuffer[]>([]);
  const downloadSizeRef = useRef<number>(0);
  const expectedSizeRef = useRef<number>(0);
  const downloadMetaRef = useRef<{ name: string, mime: string } | null>(null);

  // Host-side Handle Cache (Map full path string to FileSystemHandle)
  const handleCacheRef = useRef<HandleMap>({});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up peer connection on unmount
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      connectionsRef.current = [];
    };
  }, []);

  // =======================
  // HOST LOGIC (SERVER)
  // =======================
  const startServer = () => {
    const id = `FLUX-HOST-${Math.floor(Math.random() * 9000) + 1000}`;

    // Parse ICE servers from env
    // @ts-ignore
    const iceServers = (import.meta.env.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302')
      .split(',')
      .map((url: string) => ({ urls: url.trim() }));

    const peerConfig: any = {
      config: {
        iceServers: iceServers
      }
    };

    // Add optional self-hosted config
    // @ts-ignore
    const envHost = import.meta.env.VITE_PEER_HOST;
    if (envHost && envHost.trim() !== '') {
      // @ts-ignore
      peerConfig.host = envHost;
      // @ts-ignore
      peerConfig.port = Number(import.meta.env.VITE_PEER_PORT) || 443;
      // @ts-ignore
      peerConfig.path = import.meta.env.VITE_PEER_PATH || '/';
    }
    // Set secure flag based on environment (development => ws, production => wss)
    if (import.meta.env.VITE_ENV === 'development') {
      peerConfig.secure = false;
    } else {
      peerConfig.secure = true;
    }

    const peer = new Peer(id, peerConfig);

    peer.on('open', (id: string) => {
      setHostId(id);
      setMode('host');
      addServerLog(`Server initialized on port [VIRTUAL]. ID: ${id}`);
    });

    peer.on('connection', (conn: any) => {
      addServerLog(`Incoming connection request from ${conn.peer}`);
      connectionsRef.current.push(conn);
      setActiveConnections(prev => prev + 1);

      conn.on('open', () => {
        addServerLog(`Tunnel established: ${conn.peer}`);
      });

      conn.on('data', (data: SFTPPacket) => {
        handleHostPacket(conn, data);
      });

      conn.on('close', () => {
        addServerLog(`Connection lost: ${conn.peer}`);
        connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
        setActiveConnections(prev => prev - 1);
      });

      conn.on('error', (err: any) => {
        console.error("Connection error:", err);
        addServerLog(`Error from ${conn.peer}: ${err}`);
      });
    });

    peer.on('error', (err: any) => {
      addServerLog(`CRITICAL ERROR: ${err.type}`);
      console.error(err);
    });

    peerRef.current = peer;
  };

  const stopServer = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    // Reset Host State
    setHostId('');
    setServerLogs([]);
    setActiveConnections(0);
    setRootDirHandle(null);
    connectionsRef.current = [];

    // Reset FS State
    handleCacheRef.current = {};
    virtualFilesRef.current = new Map();
    virtualTreeRef.current = { name: 'root', kind: 'directory', children: {} };
    rootDirHandleRef.current = null;

    setMode('selection');
  };

  const handleHostPacket = async (conn: any, packet: SFTPPacket) => {
    // CRITICAL FIX: Use Refs to access the latest state inside the callback
    const currentRootHandle = rootDirHandleRef.current;
    const isNative = useNativeFSRef.current;

    switch (packet.type) {
      case 'LS_REQ':
        addServerLog(`READ_DIR: ${packet.path} from ${conn.peer}`);

        if (!currentRootHandle) {
          conn.send({ type: 'ERROR', message: 'Host has not mounted a drive yet. Please wait for host.' });
          return;
        }

        try {
          let entries: RemoteEntry[] = [];
          if (isNative) {
            entries = await getNativeDirEntries(packet.path);
          } else {
            entries = getVirtualDirEntries(packet.path);
          }
          conn.send({ type: 'LS_RES', path: packet.path, entries });
        } catch (e) {
          console.error(e);
          conn.send({ type: 'ERROR', message: 'Access Denied or Path Invalid' });
        }
        break;

      case 'GET_REQ':
        addServerLog(`READ_FILE: ${packet.path}`);
        try {
          let file: File | null = null;

          if (isNative) {
            const handle = handleCacheRef.current[packet.path];
            if (handle && handle.kind === 'file') {
              // Cast to any to bypass experimental type check issues
              file = await (handle as any).getFile();
            }
          } else {
            file = virtualFilesRef.current.get(packet.path) || null;
          }

          if (file) {
            streamFileToClient(conn, file);
          } else {
            conn.send({ type: 'ERROR', message: 'File not found or unreadable' });
          }
        } catch (e) {
          console.error(e);
          conn.send({ type: 'ERROR', message: 'File Read Error' });
        }
        break;
    }
  };

  // --- NATIVE FS HELPERS ---
  const getNativeDirEntries = async (path: string): Promise<RemoteEntry[]> => {
    const currentRoot = rootDirHandleRef.current;
    if (!currentRoot) return [];

    // @ts-ignore
    let targetHandle: FileSystemDirectoryHandle = currentRoot as FileSystemDirectoryHandle;

    if (path !== '/') {
      const handle = handleCacheRef.current[path];
      if (handle && handle.kind === 'directory') {
        targetHandle = handle as FileSystemDirectoryHandle;
      } else {
        // If handle not found in cache (rare if browsed linearly), might be an error or need deeper traversal
        // For this MVP, we rely on linear browsing
        throw new Error("Invalid path handle");
      }
    }

    const entries: RemoteEntry[] = [];
    // @ts-ignore
    for await (const entry of targetHandle.values()) {
      const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
      handleCacheRef.current[fullPath] = entry;

      let size = undefined;
      if (entry.kind === 'file') {
        // Try to get size for small files, ignore for speed on large directories
        try { const f = await (entry as any).getFile(); size = f.size; } catch (e) { }
      }

      entries.push({ name: entry.name, kind: entry.kind, size });
    }

    return entries.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
  };

  // --- VIRTUAL FS HELPERS (Fallback) ---
  const getVirtualDirEntries = (path: string): RemoteEntry[] => {
    // Traverse the virtual tree from REF
    let current = virtualTreeRef.current;

    if (path !== '/') {
      const parts = path.split('/').filter(Boolean);
      for (const part of parts) {
        if (current.children && current.children[part]) {
          current = current.children[part];
        } else {
          return [];
        }
      }
    }

    if (!current.children) return [];

    return Object.values(current.children).map((node: VirtualNode) => ({
      name: node.name,
      kind: node.kind,
      size: node.size
    })).sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
  };

  const streamFileToClient = (conn: any, file: File) => {
    conn.send({ type: 'FILE_START', name: file.name, size: file.size, mime: file.type });

    const reader = new FileReader();
    let offset = 0;

    reader.onload = (e) => {
      if (e.target?.result) {
        conn.send({ type: 'FILE_CHUNK', data: e.target.result });
        offset += CHUNK_SIZE;

        if (offset < file.size) {
          // Yield to the event loop to prevent UI freezing
          setTimeout(() => {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
          }, 0);
        } else {
          conn.send({ type: 'FILE_END' });
          addServerLog(`Transfer complete: ${file.name}`);
        }
      }
    };

    const firstSlice = file.slice(0, CHUNK_SIZE);
    reader.readAsArrayBuffer(firstSlice);
  };

  const addServerLog = (msg: string) => {
    setServerLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 14)]);
  };

  // MOUNTING LOGIC
  const handleMountDrive = async () => {
    // Try Native API first
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();

        // Update State
        setRootDirHandle(dirHandle);
        setUseNativeFS(true);

        // Update Refs (Fixes Stale Closure)
        rootDirHandleRef.current = dirHandle;
        useNativeFSRef.current = true;

        handleCacheRef.current = {};
        handleCacheRef.current['/'] = dirHandle;

        addServerLog(`Drive Mounted (Native): ${dirHandle.name}`);
        return;
      } catch (err) {
        // If cancelled, stop. If error, try fallback.
        if ((err as Error).name === 'AbortError') {
          addServerLog("Mount cancelled.");
          return;
        }
        console.warn("Native mount failed, trying fallback", err);
      }
    }

    // Fallback to hidden input
    addServerLog("Native FS unavailable. Opening file selector...");
    fallbackInputRef.current?.click();
  };

  const handleFallbackSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files) as File[];
    const fileMap = new Map<string, File>();
    const tree: VirtualNode = { name: 'root', kind: 'directory', children: {} };

    // Get root folder name from first file: "MyDir/file.txt" -> "MyDir"
    const rootName = files[0].webkitRelativePath.split('/')[0] || "Shared_Folder";

    addServerLog(`Indexing ${files.length} files...`);

    files.forEach(f => {
      const parts = f.webkitRelativePath.split('/');
      // Remove root folder from virtual path: "MyDir/Sub/File.txt" -> "/Sub/File.txt"
      // We want the browseable root to be INSIDE "MyDir"
      const relativeParts = parts.slice(1);

      // Construct Virtual Tree
      let current = tree;
      const fullPathParts: string[] = [];

      relativeParts.forEach((part, idx) => {
        fullPathParts.push(part);
        const isFile = idx === relativeParts.length - 1;

        if (isFile) {
          if (!current.children) current.children = {};
          current.children[part] = { name: part, kind: 'file', size: f.size };
          // Map absolute path for retrieval
          fileMap.set('/' + fullPathParts.join('/'), f);
        } else {
          if (!current.children) current.children = {};
          if (!current.children[part]) {
            current.children[part] = { name: part, kind: 'directory', children: {} };
          }
          current = current.children[part];
        }
      });
    });

    // Update State
    setVirtualFiles(fileMap);
    setVirtualTree(tree);
    setUseNativeFS(false);
    setRootDirHandle({ name: rootName });

    // Update Refs (Fixes Stale Closure)
    virtualFilesRef.current = fileMap;
    virtualTreeRef.current = tree;
    useNativeFSRef.current = false;
    rootDirHandleRef.current = { name: rootName };

    addServerLog(`Drive Mounted (Fallback Mode): ${rootName}`);
  };

  // =======================
  // CLIENT LOGIC
  // =======================
  const connectToServer = () => {
    const target = targetHostId.trim();
    if (!target) return;

    setConnectionStatus('connecting');
    setIsLoading(true);

    // Parse ICE servers from env
    // @ts-ignore
    const iceServers = (import.meta.env.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302')
      .split(',')
      .map((url: string) => ({ urls: url.trim() }));

    const peerConfig: any = {
      config: {
        iceServers: iceServers
      }
    };

    // Add optional self-hosted config
    // @ts-ignore
    const envHost = import.meta.env.VITE_PEER_HOST;
    if (envHost && envHost.trim() !== '') {
      // @ts-ignore
      peerConfig.host = envHost;
      // @ts-ignore
      peerConfig.port = Number(import.meta.env.VITE_PEER_PORT) || 443;
      // @ts-ignore
      peerConfig.path = import.meta.env.VITE_PEER_PATH || '/';
      // @ts-ignore
      peerConfig.secure = import.meta.env.VITE_PEER_SECURE === 'true';
    }

    const peer = new Peer(undefined, peerConfig);

    peer.on('open', () => {
      // Small delay to ensure peer is ready on network
      setTimeout(() => {
        const conn = peer.connect(target, { reliable: true });
        clientConnRef.current = conn;

        conn.on('open', () => {
          setConnectionStatus('connected');
          setMode('client');
          // Request Root with a small delay to ensure channel is ready
          setCurrentPath('/');
          setTimeout(() => {
            conn.send({ type: 'LS_REQ', path: '/' });
          }, 1000);
        });

        conn.on('data', (data: SFTPPacket) => {
          handleClientPacket(data);
        });

        conn.on('close', () => {
          alert('Host disconnected session.');
          disconnectClient();
        });

        conn.on('error', (err: any) => {
          console.error("Client connection error", err);
          setIsLoading(false);
          alert("Connection Error: " + err);
        });
      }, 500);
    });

    peer.on('error', (err: any) => {
      console.error("Peer error", err);
      setConnectionStatus('disconnected');
      setIsLoading(false);
      if (err.type === 'peer-unavailable') {
        alert(`Host ID "${target}" not found. Ensure the Host is active and the ID is correct.`);
      } else {
        alert(`Network Error: ${err.type}`);
      }
    });

    peerRef.current = peer;
  };

  const disconnectClient = () => {
    if (clientConnRef.current) {
      clientConnRef.current.close();
      clientConnRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setConnectionStatus('disconnected');
    setMode('selection');
    setRemoteEntries([]);
    setCurrentPath('/');
    setTargetHostId('');
  };

  const refreshDirectory = () => {
    if (clientConnRef.current) {
      setIsLoading(true);
      setRemoteEntries([]);
      clientConnRef.current.send({ type: 'LS_REQ', path: currentPath });
    }
  };

  const handleClientPacket = (packet: SFTPPacket) => {
    switch (packet.type) {
      case 'LS_RES':
        setIsLoading(false);
        setCurrentPath(packet.path);
        setRemoteEntries(packet.entries);
        break;

      case 'FILE_START':
        downloadBufferRef.current = [];
        downloadSizeRef.current = 0;
        expectedSizeRef.current = packet.size;
        downloadMetaRef.current = { name: packet.name, mime: packet.mime };
        setCurrentDownload(packet.name);
        setDownloadProgress(0);
        break;

      case 'FILE_CHUNK':
        downloadBufferRef.current.push(packet.data);
        downloadSizeRef.current += packet.data.byteLength;
        if (expectedSizeRef.current > 0) {
          setDownloadProgress(Math.round((downloadSizeRef.current / expectedSizeRef.current) * 100));
        }
        break;

      case 'FILE_END':
        const blob = new Blob(downloadBufferRef.current, { type: downloadMetaRef.current?.mime || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = downloadMetaRef.current?.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setCurrentDownload(null);
        setDownloadProgress(0);
        break;

      case 'ERROR':
        setIsLoading(false);
        // If it's a "not mounted" error, we can show a simpler message in the UI or just log it
        if (packet.message.includes('not mounted')) {
          console.warn(packet.message);
        } else {
          alert(`SERVER ERROR: ${packet.message}`);
        }
        break;
    }
  };

  const navigateTo = (entry: RemoteEntry) => {
    if (entry.kind === 'directory') {
      // Construct new path
      const newPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      setRemoteEntries([]); // Clear current view while loading
      setIsLoading(true);
      clientConnRef.current.send({ type: 'LS_REQ', path: newPath });
    } else {
      // It's a file, request download
      const filePath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      clientConnRef.current.send({ type: 'GET_REQ', path: filePath });
    }
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/');
    parts.pop(); // Remove last segment
    const newPath = parts.length <= 1 ? '/' : parts.join('/');
    setRemoteEntries([]);
    setIsLoading(true);
    clientConnRef.current.send({ type: 'LS_REQ', path: newPath });
  };

  // =======================
  // UI RENDER
  // =======================

  if (mode === 'selection') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[50vh] animate-fadeIn">
        {/* Hidden Fallback Input */}
        <input
          type="file"
          ref={fallbackInputRef}
          className="hidden"
          onChange={handleFallbackSelection}
          {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
        />

        {/* Host Card */}
        <div className="group relative bg-[#0a0a12] border border-[#333] hover:border-[#00f3ff] p-8 rounded-xl transition-all duration-500 overflow-hidden flex flex-col items-center text-center hover:shadow-[0_0_30px_rgba(0,243,255,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#00f3ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-[#00f3ff]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#00f3ff] group-hover:scale-110 transition-transform duration-500">
              <Server size={40} />
            </div>
            <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-wide">HOST SYSTEM</h2>
            <p className="text-gray-400 font-mono text-xs mb-8 h-10">
              Turn this device into an SFTP Node. Mount a local folder or drive to share.
            </p>
            <button
              onClick={startServer}
              className="cyber-button px-8 py-3 w-full font-bold tracking-widest"
            >
              INITIALIZE NODE
            </button>
          </div>
        </div>

        {/* Client Card */}
        <div className="group relative bg-[#0a0a12] border border-[#333] hover:border-[#bc13fe] p-8 rounded-xl transition-all duration-500 overflow-hidden flex flex-col items-center text-center hover:shadow-[0_0_30px_rgba(188,19,254,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#bc13fe]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 w-full">
            <div className="w-20 h-20 bg-[#bc13fe]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#bc13fe] group-hover:scale-110 transition-transform duration-500">
              <HardDrive size={40} />
            </div>
            <h2 className="text-3xl font-display font-bold text-white mb-2 tracking-wide">REMOTE ACCESS</h2>
            <p className="text-gray-400 font-mono text-xs mb-8 h-10">
              Browse and download files from a Host Node using its ID.
            </p>

            <div className="flex gap-2 w-full">
              <input
                type="text"
                placeholder="ENTER HOST ID"
                className="flex-1 bg-black border border-[#333] focus:border-[#bc13fe] outline-none text-[#bc13fe] font-mono text-sm px-3 py-2 rounded placeholder-gray-700 transition-colors uppercase"
                value={targetHostId}
                onChange={e => setTargetHostId(e.target.value.toUpperCase())}
              />
              <button
                onClick={connectToServer}
                disabled={!targetHostId || connectionStatus === 'connecting'}
                className="cyber-button-secondary px-4 py-2 flex items-center justify-center disabled:opacity-50"
              >
                {connectionStatus === 'connecting' ? <Activity className="animate-spin" size={20} /> : <ArrowRight size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. HOST UI
  if (mode === 'host') {
    return (
      <div className="flex flex-col gap-6 animate-fadeIn">
        {/* Hidden Fallback Input for Re-mounting */}
        <input
          type="file"
          ref={fallbackInputRef}
          className="hidden"
          onChange={handleFallbackSelection}
          {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
        />

        {/* Header Bar */}
        <div className="flex justify-between items-end border-b border-[#00f3ff]/30 pb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <Activity className="text-[#00f3ff] animate-pulse" />
              NODE ACTIVE
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[#00f3ff] font-mono text-sm bg-[#00f3ff]/10 px-2 py-1 rounded border border-[#00f3ff]/30 select-all">{hostId}</span>
              <button onClick={() => navigator.clipboard.writeText(hostId)} className="text-gray-500 hover:text-white transition-colors"><Copy size={14} /></button>
            </div>
          </div>
          <button onClick={stopServer} className="text-red-500 font-mono text-xs hover:text-red-400 flex items-center gap-1 border border-transparent hover:border-red-500/50 p-2 rounded transition-all">
            <X size={14} /> TERMINATE
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0a0a15] border border-[#333] p-4 rounded-lg">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">SYSTEM STATUS</div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">CONNECTIONS</span>
                <span className="text-[#00f3ff] font-bold">{activeConnections}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">MOUNT TYPE</span>
                <span className="text-white font-mono text-xs">{useNativeFS ? 'NATIVE_FS_API' : 'VIRTUAL_FALLBACK'}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">MOUNTED PATH</span>
                <span className="text-white font-mono text-xs truncate max-w-[150px]" title={rootDirHandle?.name || 'NONE'}>
                  {rootDirHandle?.name || 'NOT MOUNTED'}
                </span>
              </div>
            </div>

            <div className="bg-black border border-[#333] p-4 rounded-lg h-[400px] overflow-y-auto font-mono text-[10px] text-green-500/80 shadow-inner">
              <div className="mb-2 text-gray-500 pb-2 border-b border-[#222]">TERMINAL LOGS</div>
              {serverLogs.map((log, i) => (
                <div key={i} className="mb-1 whitespace-nowrap">{log}</div>
              ))}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="lg:col-span-2 bg-[#0a0a12] border border-[#333] rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Database size={150} />
            </div>

            {!rootDirHandle ? (
              <div className="text-center z-10">
                <div className="w-24 h-24 bg-[#00f3ff]/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-float">
                  <FolderOpen size={48} className="text-[#00f3ff]" />
                </div>
                <h3 className="text-xl font-display text-white mb-2">MOUNT LOCAL FILESYSTEM</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                  Select a folder or drive to share. The remote user will be able to browse this directory recursively.
                </p>
                <button
                  onClick={handleMountDrive}
                  className="cyber-button px-6 py-3 font-bold flex items-center gap-2 mx-auto"
                >
                  <Upload size={18} /> SELECT ROOT DIRECTORY
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col z-10">
                <div className="flex items-center justify-between mb-4 bg-[#050508] p-4 rounded border border-[#333]">
                  <div className="flex items-center gap-3">
                    <HardDrive size={24} className="text-[#00f3ff]" />
                    <div>
                      <div className="text-xs text-gray-500 font-mono">ROOT ACCESS GRANTED</div>
                      <div className="text-white font-bold">{rootDirHandle.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#00f3ff] text-xs font-mono animate-pulse">
                    <Activity size={14} /> BROADCASTING
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-600 font-mono text-sm border border-dashed border-[#333] rounded">
                  Awaiting remote requests...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. CLIENT UI
  if (mode === 'client') {
    return (
      <div className="animate-fadeIn flex flex-col h-[70vh]">
        {/* Client Header */}
        <div className="bg-[#050510]/90 border border-[#bc13fe]/30 rounded-t-lg p-4 flex justify-between items-center backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#bc13fe]/10 rounded flex items-center justify-center border border-[#bc13fe]/30">
              <Terminal size={20} className="text-[#bc13fe]" />
            </div>
            <div>
              <h2 className="text-lg font-display text-white leading-none">CONNECTED TO: <span className="text-[#bc13fe]">{targetHostId}</span></h2>
              <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> SECURE TUNNEL
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshDirectory}
              title="Refresh Directory"
              className="p-2 text-[#bc13fe] hover:bg-[#bc13fe]/10 rounded transition-colors border border-[#bc13fe]/20"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={disconnectClient} className="text-gray-500 hover:text-white transition-colors bg-[#222] p-2 rounded hover:bg-red-900/50">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* File Explorer */}
        <div className="flex-1 bg-[#0a0a12] border-x border-b border-[#333] rounded-b-lg p-6 relative overflow-hidden flex flex-col">

          {/* Breadcrumbs */}
          <div className="flex justify-between items-center mb-4 z-10 bg-[#050508] p-2 rounded border border-[#222]">
            <div className="flex items-center gap-2 text-sm font-mono overflow-x-auto whitespace-nowrap scrollbar-none">
              <button onClick={() => {
                setCurrentPath('/');
                setIsLoading(true);
                setRemoteEntries([]);
                clientConnRef.current?.send({ type: 'LS_REQ', path: '/' });
              }} className="text-[#bc13fe] hover:text-white transition-colors"><Home size={16} /></button>

              {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
                <React.Fragment key={i}>
                  <span className="text-gray-600">/</span>
                  <span className="text-gray-300">{part}</span>
                </React.Fragment>
              ))}
            </div>

            {currentPath !== '/' && (
              <button onClick={navigateUp} className="text-xs text-gray-500 hover:text-white font-mono uppercase ml-4">
                [ LEVEL UP ]
              </button>
            )}
          </div>

          {currentDownload && (
            <div className="mb-4 bg-[#bc13fe]/10 border border-[#bc13fe]/30 p-2 rounded flex justify-between items-center">
              <span className="text-[#bc13fe] font-mono text-xs animate-pulse">DOWNLOADING: {currentDownload}</span>
              <span className="text-white font-bold text-xs">{downloadProgress}%</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto relative z-10">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Loader2 size={32} className="animate-spin mb-4 opacity-50 text-[#bc13fe]" />
                <span className="font-mono text-xs">FETCHING DATA STREAM...</span>
              </div>
            ) : remoteEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Folder size={32} className="mb-4 opacity-30" />
                <span className="font-mono text-xs">DIRECTORY EMPTY</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {remoteEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    onClick={() => !currentDownload && navigateTo(entry)}
                    className={`
                             group p-3 border border-[#333] rounded bg-[#050508] hover:border-[#bc13fe] transition-all cursor-pointer relative overflow-hidden flex items-center gap-3
                             ${currentDownload ? 'opacity-50 cursor-wait' : ''}
                           `}
                  >
                    <div className="text-gray-400 group-hover:text-[#bc13fe] transition-colors">
                      {entry.kind === 'directory' ? <Folder size={20} /> : <FileIcon size={20} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-300 font-mono text-sm truncate group-hover:text-white">{entry.name}</h4>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-600 uppercase">{entry.kind}</span>
                        {entry.size && <span className="text-[10px] text-gray-500">{(entry.size / 1024).toFixed(1)} KB</span>}
                      </div>
                    </div>

                    {entry.kind === 'directory' ? (
                      <ChevronRight size={16} className="text-gray-700 group-hover:text-[#bc13fe]" />
                    ) : (
                      <Download size={16} className="text-gray-700 group-hover:text-[#bc13fe] opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#bc13fe 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SFTPManager;

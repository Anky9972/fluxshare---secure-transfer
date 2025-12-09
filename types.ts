
export interface SFTPCredentials {
  id: string;
  host: string;
  username: string;
  password?: string;
  createdAt: string;
  status: 'active' | 'inactive';
  region: string;
}

// Protocol Types
export type SFTPPacket =
  | { type: 'HANDSHAKE'; clientName: string }
  | { type: 'LS_REQ'; path: string }
  | { type: 'LS_RES'; path: string; entries: RemoteEntry[] }
  | { type: 'GET_REQ'; path: string }
  | { type: 'FILE_START'; name: string; size: number; mime: string }
  | { type: 'FILE_CHUNK'; data: ArrayBuffer }
  | { type: 'FILE_END' }
  | { type: 'ERROR'; message: string };

export interface RemoteEntry {
  name: string;
  kind: 'file' | 'directory';
  size?: number;
  lastModified?: number;
}

export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  accessCode: string;
  progress: number;
  status: 'broadcasting' | 'uploading' | 'downloading' | 'completed' | 'error' | 'queued' | 'paused';
  isIncoming?: boolean;
  fileData?: File;
  downloadUrl?: string;
  encrypted?: boolean;
  priority?: number;
  bytesTransferred?: number;
  speed?: number;
}

// Enhanced P2P Message Types
export type P2PMessage =
  | { type: 'REQUEST_FILE'; code: string }
  | { type: 'FILE_FOUND'; code: string; name: string; size: number; mimeType: string; encrypted?: boolean }
  | { type: 'FILE_DATA'; code: string; file: File | ArrayBuffer }
  | { type: 'FILE_CHUNK'; code: string; chunk: ArrayBuffer; index: number; total: number; checksum?: string }
  | { type: 'FILE_RESUME'; code: string; fromChunk: number }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'CHAT'; text: string; timestamp: number; markdown?: boolean; replyTo?: string }
  | { type: 'VOICE_MESSAGE'; audioData: string; duration: number; timestamp: number; waveformData?: number[] }
  | { type: 'URL_SHARE'; url: string; metadata?: URLMetadata; timestamp: number }
  | { type: 'WHITEBOARD_STROKE'; stroke: WhiteboardStroke }
  | { type: 'WHITEBOARD_CLEAR' }
  | { type: 'FILE_REQUEST'; fileType?: string; description?: string }
  | { type: 'VERIFICATION_CODE'; code: string }
  | { type: 'ENCRYPTION_KEY'; publicKey: string }
  | { type: 'REACTION'; messageId: string; emoji: string }
  | { type: 'SCREEN_SHARE_START' }
  | { type: 'SCREEN_SHARE_STOP' }
  | { type: 'DRAWING_DATA'; canvasData: string };

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'peer' | 'system';
  timestamp: number;
  markdown?: boolean;
  replyTo?: string;
  reactions?: { emoji: string; userId: string }[];
  voiceRecording?: VoiceRecording;
  urlPreview?: URLMetadata;
}

// Voice Recording Types
export interface VoiceRecording {
  id: string;
  blob?: Blob;
  audioData?: string; // base64 for transmission
  duration: number;
  timestamp: number;
  waveformData?: number[];
}

// URL Metadata for rich previews
export interface URLMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

// Whiteboard Types
export interface WhiteboardStroke {
  id: string;
  points: number[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser' | 'highlighter' | 'line' | 'circle' | 'rectangle';
  timestamp: number;
}

// Transfer Queue Types
export interface TransferQueueItem {
  id: string;
  file: File;
  peerId: string;
  priority: number;
  status: 'queued' | 'transferring' | 'paused' | 'completed' | 'error';
  bytesTransferred: number;
  totalBytes: number;
  chunks?: ArrayBuffer[];
  currentChunk?: number;
  speed?: number;
  estimatedTimeRemaining?: number;
}

// Analytics Types
export interface ConnectionMetrics {
  latency: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  timestamp: number;
}

export interface TransferMetrics {
  transferId: string;
  speed: number;
  bytesTransferred: number;
  totalBytes: number;
  timestamp: number;
}

// Theme Types
export interface ThemeConfig {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

// Settings Types
export interface UserSettings {
  theme: ThemeConfig;
  username?: string;
  soundEffects: boolean;
  notifications: boolean;
  backgroundPattern: 'grid' | 'particles' | 'waves';
  autoDownload: boolean;
  maxParallelTransfers: number;
  bandwidthLimit?: number; // KB/s
  encryptionEnabled: boolean;
}

// Favorites Types
export interface FavoritePeer {
  peerId: string;
  nickname?: string;
  lastConnected: number;
  totalTransfers: number;
}

// Encryption Types
export interface EncryptedFile {
  encryptedData: ArrayBuffer;
  salt: string;
  iv: string;
  fileName: string;
  mimeType: string;
  originalSize: number;
}

// Recording Types
export interface ScreenRecording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  thumbnail?: string;
}

// Call Types
export interface CallState {
  status: 'idle' | 'calling' | 'incoming' | 'connected';
  peerId?: string;
  startTime?: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isPiPMode: boolean;
  virtualBackgroundEnabled: boolean;
}

// Notification Types
export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

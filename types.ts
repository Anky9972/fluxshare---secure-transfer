
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
  | { type: 'LS_REQ'; path: string } // Request listing for specific path
  | { type: 'LS_RES'; path: string; entries: RemoteEntry[] } // Response with entries
  | { type: 'GET_REQ'; path: string } // Download file request with full path
  | { type: 'FILE_START'; name: string; size: number; mime: string }
  | { type: 'FILE_CHUNK'; data: ArrayBuffer }
  | { type: 'FILE_END' }
  | { type: 'ERROR'; message: string };

export interface RemoteEntry {
  name: string;
  kind: 'file' | 'directory';
  size?: number; // Optional, as getting size for all files might be expensive
  lastModified?: number;
}

export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  accessCode: string; 
  progress: number;
  status: 'broadcasting' | 'uploading' | 'downloading' | 'completed' | 'error';
  isIncoming?: boolean;
  fileData?: File; 
  downloadUrl?: string;
}

export type P2PMessage = 
  | { type: 'REQUEST_FILE'; code: string }
  | { type: 'FILE_FOUND'; code: string; name: string; size: number; mimeType: string }
  | { type: 'FILE_DATA'; code: string; file: File }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'CHAT'; text: string; timestamp: number };

export interface ChatMessage {
  id: string;
  sender: 'me' | 'peer' | 'system';
  text: string;
  timestamp: number;
}

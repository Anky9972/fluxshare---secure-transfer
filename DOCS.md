# FluxShare Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)

## 🌐 Overview

FluxShare is a cyberpunk-themed secure file transfer and communication platform. All communications are peer-to-peer, encrypted, and require no central server for data transfer.

## ✨ Features

### 🔒 Secure Node (SFTP)
Transfer files via encrypted SFTP protocol with real-time progress tracking and multi-file support.

### 📡 Quick Link (P2P)
Direct peer-to-peer file sharing using WebRTC. No servers needed - files go directly between devices.

**Transmitter Mode:**
- Select files to send
- Share your Peer ID
- Click "INITIATE UPLOAD"

**Receiver Mode:**
- Enter sender's Peer ID
- Click "CONNECT TO PEER"
- Accept incoming files

### 💬 Comm Link
Video calling with text chat, camera controls, and encrypted communication.

**Features:**
- Video/audio toggle
- Camera flip (front/back)
- Real-time text chat
- Encrypted peer-to-peer

### 📢 Broadcast
Send messages to all connected peers on the network.

**How to use:**
1. Click "SCAN_NETWORK" to find peers
2. Type your message
3. Click "SEND" to broadcast

## 🚀 Getting Started

### Installation
```bash
npm install
npm run dev
```

### For Broadcast Feature
```bash
npm run peer-server
```

### Environment Setup
Create `.env` file:
```
VITE_ICE_SERVERS=stun:stun.l.google.com:19302
VITE_PEER_HOST=localhost
VITE_PEER_PORT=9000
```

## 📖 Usage Guide

### SFTP Transfer
1. Navigate to "Secure Node (SFTP)" tab
2. Enter server credentials
3. Upload files via drag-and-drop
4. Monitor progress

### P2P Sharing
1. Open "Quick Link (P2P)"
2. Select TRANSMITTER or RECEIVER mode
3. Share/enter Peer IDs
4. Transfer files directly

### Video Calls
1. Go to "Comm Link"
2. Your ID displays at top
3. Enter peer ID and call
4. Use controls for camera/mic

### Broadcasting
1. Select "Broadcast" tab
2. Scan for active peers
3. Send messages to all

## 🐛 Troubleshooting

### Connection Issues
- **Check firewall settings**
- **Verify both peers are online**
- **Use TURN servers for NAT**

### Video Not Working
- **Allow camera/mic permissions**
- **Use HTTPS in production**
- **Try Chrome or Firefox**

### No Peers Found
- **Start peer server**: `npm run peer-server`
- **Check port 9000 is free**
- **Verify network connection**

## 🎨 Theme

Cyberpunk color palette:
- Cyan: `#00f3ff`
- Purple: `#bc13fe`
- Dark: `#050510`

## 🔐 Security

- WebRTC encryption
- No data storage
- Direct peer transfers
- HTTPS enforced in production

---

**Need help?** Check the STATUS menu for system info.

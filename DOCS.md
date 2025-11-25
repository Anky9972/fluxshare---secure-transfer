# FluxShare Documentation

## Environment Configuration

FluxShare uses environment variables to configure various features. Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

### Environment Variables

#### AI Features (Optional)
- `GEMINI_API_KEY`: Your Google Gemini API key for AI-powered quick replies in chat
  - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
  - This is optional - chat works without AI features

#### P2P Configuration
- `VITE_ICE_SERVERS`: Comma-separated list of STUN/TURN servers for WebRTC connections
  - Default: `stun:stun.l.google.com:19302,stun:global.stun.twilio.com:3478`
  - These help establish peer-to-peer connections through NAT/firewalls

#### P2P Share PeerJS Server (Optional)
- `VITE_PEER_HOST`: Custom PeerJS server hostname (leave empty for default cloud server)
- `VITE_PEER_PORT`: Custom PeerJS server port (default: 443)
- `VITE_PEER_PATH`: Custom PeerJS server path (default: `/`)
- `VITE_ENV`: Environment type (`development` or `production`)

#### Broadcast Hub PeerJS Server (Required for Broadcast Feature)
- `VITE_BROADCAST_PEER_HOST`: PeerJS server hostname for broadcast functionality
  - **Local development**: Can use `localhost` if running a local PeerJS server
  - **Production/Netlify**: MUST use a public server (e.g., `0.peerjs.com`)
- `VITE_BROADCAST_PEER_PORT`: PeerJS server port (default: 443 for public servers)
- `VITE_BROADCAST_PEER_PATH`: PeerJS server path (default: `/`)

### PeerJS Server Options

The Broadcast Hub feature requires a PeerJS server that supports **peer listing** (the `/peerjs/peers` endpoint). This is required for the network scanning feature to discover other connected peers.

> [!IMPORTANT]
> **The free public PeerJS server at `0.peerjs.com` does NOT support peer listing** and will return 404 errors when trying to scan for peers. You **MUST** deploy your own PeerJS server for the Broadcast feature to work.

#### Deploy Your Own PeerJS Server (Required)

I've created a ready-to-deploy PeerJS server in the `peer-server-deploy/` directory with peer listing enabled.

**Quick Deploy to Railway (Free):**

1. Go to [Railway](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your FluxShare repository
4. Set root directory to `peer-server-deploy`
5. Railway will auto-detect and deploy
6. Copy your deployment URL (e.g., `your-app.railway.app`)

**Alternative Platforms:**
- [Render](https://render.com) - Free tier available
- [Heroku](https://heroku.com) - Paid tiers
- Any VPS with Node.js support

**After Deployment:**

Update your `.env` file:
```env
VITE_BROADCAST_PEER_HOST=your-app.railway.app
VITE_BROADCAST_PEER_PORT=443
VITE_BROADCAST_PEER_PATH=/
```

For detailed deployment instructions, see [peer-server-deploy/README.md](file:///c:/Users/asus/Downloads/fluxshare---secure-transfer/peer-server-deploy/README.md)


For better reliability and control, deploy your own PeerJS server:

1. **Quick Deploy to Railway/Render/Heroku**:
   ```bash
   # Navigate to the deployment directory
   cd peer-server-deploy
   
   # See README.md for detailed deployment instructions
   ```

2. **Update your `.env`**:
   ```env
   VITE_BROADCAST_PEER_HOST=your-app.railway.app
   VITE_BROADCAST_PEER_PORT=443
   VITE_BROADCAST_PEER_PATH=/
   ```

### Netlify Deployment Configuration

When deploying to Netlify, you **must** configure environment variables in the Netlify dashboard:

1. Go to your site in Netlify Dashboard
2. Navigate to: **Site settings → Environment variables**
3. Add the following variables (after deploying your PeerJS server):

```
VITE_BROADCAST_PEER_HOST=your-app.railway.app
VITE_BROADCAST_PEER_PORT=443
VITE_BROADCAST_PEER_PATH=/
VITE_ENV=production
GEMINI_API_KEY=your_api_key_here (if using AI features)
```

4. Redeploy your site for changes to take effect

**Important**: Never use `localhost` as the host for production deployments - it will only work on your local machine!

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

### For Local Development with Broadcast
If you want to run a local PeerJS server for testing broadcast features:
```bash
npm run peer-server
```

Then update your `.env`:
```
VITE_BROADCAST_PEER_HOST=localhost
VITE_BROADCAST_PEER_PORT=9000
VITE_BROADCAST_PEER_PATH=/
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
2. Click "SCAN_NETWORK" to find active peers
3. Type your message
4. Click "SEND" to broadcast to all

## 🐛 Troubleshooting

### Connection Issues
- **Check firewall settings**
- **Verify both peers are online**
- **Use TURN servers for NAT**

### Video Not Working
- **Allow camera/mic permissions**
- **Use HTTPS in production**
- **Try Chrome or Firefox**

### Broadcast: "Could not connect to server at localhost:9000"
- **If deployed on Netlify**: Configure public PeerJS server in environment variables (see [Netlify Deployment Configuration](#netlify-deployment-configuration))
- **If local development**: Make sure you have configured `VITE_BROADCAST_PEER_HOST` in your `.env` file
- **Never use localhost for production deployments**

### No Peers Found in Broadcast
- **Verify PeerJS server is accessible**
- **Check that server supports peer listing**
- **Ensure all peers are connected to the same server**
- **Try clicking "SCAN_NETWORK" again**

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

# 🌐 FluxShare 2099

<div align="center">

**Cyberpunk-Themed Secure P2P File Transfer & Communication Platform**

[![Built with React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-00f3ff)](https://webrtc.org/)
[![License](https://img.shields.io/badge/License-MIT-bc13fe)](LICENSE)

<img src="https://img.shields.io/badge/Status-Production%20Ready-00ff9d" alt="Status"/>

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Tech Stack](#-tech-stack)

</div>

---

## 🎯 Overview

FluxShare is a next-generation **peer-to-peer file sharing and communication platform** with a stunning cyberpunk aesthetic. Built on WebRTC technology, it enables **direct, encrypted transfers** between peers without relying on centralized servers. Experience blazing-fast file sharing, real-time video calls, and network-wide broadcasting—all wrapped in a visually striking interface.

### Why FluxShare?

- 🔐 **Zero Server Storage** - Files never touch a server
- ⚡ **Direct P2P Transfers** - Maximum speed, minimum latency
- 🎨 **Cyberpunk UI** - Animated backgrounds, glitch effects, neon aesthetics
- 🔒 **WebRTC Encryption** - End-to-end encrypted communications
- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile
- 🎥 **Built-in Video Calls** - No need for separate apps
- 📡 **Network Broadcasting** - Send messages to all connected peers

---

## ✨ Features

### 🔒 Secure Node (SFTP)
Upload files to a mounted SFTP server with real-time progress tracking, multi-file support, and cyberpunk-themed UI elements including scanline effects and glitch animations.

**Key Features:**
- Encrypted SFTP protocol
- Drag-and-drop file upload
- Real-time transfer progress
- Multi-file batch uploads

### 📡 Quick Link (P2P)
The core of FluxShare - direct peer-to-peer file sharing using WebRTC data channels. No intermediary servers, just pure P2P magic.

**Transmitter Mode:**
- Select files to share
- Generate unique Peer ID
- Send files directly to receiver

**Receiver Mode:**
- Enter transmitter's Peer ID
- Accept incoming files
- **Preview before download** (images, videos, PDFs, code)
- **Copy code snippets** with one click

**Preview Supported Formats:**
- 🖼️ Images: JPG, PNG, GIF, WebP, SVG
- 🎬 Videos: MP4, WebM, MOV, AVI
- 🎵 Audio: MP3, WAV, OGG, FLAC
- 📄 PDFs: Full document preview
- 💻 Code: JS, TS, Python, Java, C++, etc. (with syntax display & copy)
- 📝 Text: TXT, LOG, CSV, MD

### 💬 Comm Link
Full-featured video calling with text chat, all encrypted via WebRTC.

**Features:**
- HD video calling
- Real-time text chat
- Camera flip (front/back)
- Video/audio toggle controls
- Picture-in-picture local feed
- Encrypted peer-to-peer

### 📢 Broadcast Hub
Scan your network for active peers and send messages to everyone at once.

**Features:**
- Network peer discovery
- One-to-many messaging
- Active peer list
- Delivery confirmation

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 16.x
npm or yarn
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/fluxshare.git
cd fluxshare
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment** (optional)
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
VITE_ICE_SERVERS=stun:stun.l.google.com:19302
VITE_PEER_HOST=localhost
VITE_PEER_PORT=9000
VITE_ENV=development
```

4. **Start development server**
```bash
npm run dev
```

5. **Start peer server** (for Broadcast feature)
```bash
npm run peer-server
```

Access the app at `http://localhost:5173`

---

## 📖 Documentation

### Using Quick Link (P2P)

#### As Transmitter:
1. Click **"Quick Link (P2P)"** tab
2. Select **TRANSMITTER** mode
3. Choose file(s) to send
4. Share your **Peer ID** with receiver
5. Click **"INITIATE UPLOAD"**

#### As Receiver:
1. Click **"Quick Link (P2P)"** tab
2. Select **RECEIVER** mode
3. Enter transmitter's **Peer ID**
4. Click **"CONNECT TO PEER"**
5. **PREVIEW** or **SAVE** received files

### Video Calling (Comm Link)

1. Navigate to **"Comm Link"** tab
2. Your ID displays at the top - share it
3. Enter peer's ID in the input field
4. Click the **phone icon** to call
5. Use controls:
   - 📹 Toggle video
   - 🎤 Toggle microphone
   - 🔄 Flip camera
   - ❌ End call

### Broadcasting

1. Open **"Broadcast"** tab
2. Click **"SCAN_NETWORK"**
3. Wait for peer discovery
4. Type your message
5. Click **"SEND"** to broadcast

---

## 🛠️ Tech Stack

### Core Technologies
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first styling

### P2P & Communication
- **PeerJS** - WebRTC abstraction layer
- **WebRTC** - Peer-to-peer data channels & media streaming

### UI/UX
- **Lucide React** - Icon library
- **HTML5 Canvas** - Interactive background animations
- **CSS Animations** - Glitch effects, scanlines, pulses

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ICE_SERVERS` | STUN/TURN servers (comma-separated) | `stun:stun.l.google.com:19302` |
| `VITE_PEER_HOST` | PeerJS server hostname | `localhost` |
| `VITE_PEER_PORT` | PeerJS server port | `9000` |
| `VITE_PEER_PATH` | PeerJS server path | `/` |
| `VITE_ENV` | Environment mode | `development` |

### Color Palette

FluxShare uses a cyberpunk-inspired color scheme:

```css
Primary (Cyan):    #00f3ff
Secondary (Purple): #bc13fe
Accent (Green):    #00ff9d
Accent (Pink):     #ff0055
Accent (Yellow):   #f3ff00
Dark Background:   #050510
```

---

## 🐛 Troubleshooting

### P2P Connection Fails

**Problem:** Peers cannot connect to each other

**Solutions:**
- Ensure both peers use the same PeerJS server
- Check firewall settings
- Try using TURN servers for NAT traversal
- Verify both peers are online

### Video Call Not Working

**Problem:** Camera/microphone not accessible

**Solutions:**
- Allow browser permissions for camera/mic
- Use HTTPS in production (required for WebRTC)
- Check device is not being used by another app
- Try Chrome or Firefox (best WebRTC support)

### Broadcast Shows No Peers

**Problem:** Network scan finds 0 peers

**Solutions:**
- Start peer server: `npm run peer-server`
- Verify port 9000 is available
- Check if other instances are connected to same server
- Ensure firewall allows connections

### File Preview Not Working

**Problem:** Preview button doesn't show file

**Solutions:**
- Check file format is supported
- For large files, preview may take time to load
- Try downloading the file first
- Check browser console for errors

---

## 📂 Project Structure

```
fluxshare/
├── components/
│   ├── Header.tsx              # App header with nav
│   ├── InteractiveBackground.tsx  # Animated grid background
│   ├── P2PShare.tsx            # P2P file sharing logic
│   ├── SFTPManager.tsx         # SFTP upload component
│   ├── CommunicationHub.tsx    # Video calling
│   ├── BroadcastHub.tsx        # Network broadcasting
│   ├── FilePreviewModal.tsx    # Universal file previewer
│   ├── DocsModal.tsx           # Documentation modal
│   └── StatusModal.tsx         # System status display
├── services/
│   └── geminiService.ts        # AI assistant integration
├── types/
│   └── index.ts                # TypeScript type definitions
├── App.tsx                     # Main application component
├── index.html                  # HTML entry point with styles
├── index.tsx                   # React entry point
└── README.md                   # This file
```

---

## 🎨 Design Features

### Animations
- **Glitch Text** - RGB split effect on header
- **Scanlines** - Retro CRT monitor effect
- **Pulse Glow** - Animated neon glows
- **Interactive Grid** - Mouse-reactive background
- **Smooth Transitions** - Fluid state changes

### Responsive Design
- Mobile-first approach
- Adaptive layouts for all screen sizes
- Touch-friendly controls
- Optimized for portrait and landscape

---

## 🔐 Security

- **WebRTC Encryption:** All P2P data is encrypted end-to-end
- **No Server Storage:** Files never stored on servers
- **Local Processing:** All previews processed client-side
- **Secure Context:** HTTPS enforced in production
- **Privacy First:** No tracking, no analytics

---

## 🌐 Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | ✅ Full support |
| Edge | 90+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |
| Mobile Chrome | Latest | ⚠️ Limited camera flip |
| Mobile Safari | Latest | ⚠️ Limited camera flip |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **PeerJS** - Simplifying WebRTC
- **Lucide** - Beautiful icon set
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Next generation frontend tooling

---

<div align="center">

**Built with ❤️ and ⚡ by the FluxShare Team**

*Redefining file sharing for the cyberpunk era*

[![Star on GitHub](https://img.shields.io/github/stars/yourusername/fluxshare?style=social)](https://github.com/yourusername/fluxshare)

</div>

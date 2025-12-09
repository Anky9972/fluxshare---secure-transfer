# FluxShare Mobile App - Flutter Implementation Guide

## 📱 App Overview

**App Name:** FluxShare 2099  
**Tagline:** Cyberpunk-Themed Secure P2P File Transfer & Communication Platform  
**Platform:** Flutter (iOS & Android)  
**Architecture:** MVVM (Model-View-ViewModel)  
**Primary Color Scheme:** Cyberpunk/Neon Theme  

### Core Value Proposition
FluxShare is a next-generation peer-to-peer file sharing and communication platform with a stunning cyberpunk aesthetic. Built on WebRTC technology, it enables direct, encrypted transfers between peers without relying on centralized servers.

---

## 🎯 Key Features

### 1. **Secure Node (SFTP)**
Upload files to a mounted SFTP server with real-time progress tracking.

**Features:**
- Encrypted SFTP protocol
- Drag-and-drop file upload (mobile: file picker)
- Real-time transfer progress
- Multi-file batch uploads
- Connection management (save/load credentials)

### 2. **Quick Link (P2P Share)**
Direct peer-to-peer file sharing using WebRTC data channels.

**Transmitter Mode:**
- Select files from device storage
- Generate unique Peer ID
- Share ID via QR code or copy to clipboard
- Send files directly to receiver
- Real-time transfer progress

**Receiver Mode:**
- Enter transmitter's Peer ID or scan QR code
- Accept incoming files
- Preview files before downloading (images, videos, PDFs, code)
- Copy code snippets with one click
- Save to device storage

**Preview Supported Formats:**
- 🖼️ Images: JPG, PNG, GIF, WebP, SVG
- 🎬 Videos: MP4, WebM, MOV, AVI
- 🎵 Audio: MP3, WAV, OGG, FLAC
- 📄 PDFs: Full document preview
- 💻 Code: JS, TS, Python, Java, C++, etc. (with syntax highlighting & copy)
- 📝 Text: TXT, LOG, CSV, MD

### 3. **Comm Link (Video Chat)**
Full-featured video calling with text chat, all encrypted via WebRTC.

**Features:**
- HD video calling
- Real-time text chat
- Camera flip (front/back)
- Video/audio toggle controls
- Picture-in-picture mode
- Encrypted peer-to-peer
- Connection status indicators

### 4. **Broadcast Hub**
Scan your network for active peers and send messages to everyone at once.

**Features:**
- Network peer discovery
- One-to-many messaging
- Active peer list with status
- Delivery confirmation
- Peer management

---

## 🎨 Design Specifications

### Color Palette
```
Primary (Cyan):     #00F3FF
Secondary (Purple): #BC13FE
Accent (Green):     #00FF9D
Accent (Pink):      #FF0055
Accent (Yellow):    #F3FF00
Dark Background:    #050510
Card Background:    #0A0A1A (semi-transparent)
Text Primary:       #E0E0FF
Text Secondary:     #888899
Border:             #222233
```

### Typography
```
Primary Font: Orbitron / Rajdhani (cyberpunk-style, geometric)
Secondary Font: Share Tech Mono (for code/IDs)
Fallback: Roboto Mono

Font Sizes:
- Heading 1: 32sp (bold)
- Heading 2: 24sp (bold)
- Heading 3: 20sp (medium)
- Body: 16sp (regular)
- Caption: 14sp (regular)
- Small: 12sp (regular)
```

### UI Theme Elements
1. **Glitch Text Effect** - RGB split effect on headers
2. **Scanlines** - Retro CRT monitor overlay
3. **Pulse Glow** - Animated neon glows on active elements
4. **Cyberpunk Borders** - Angled corners (clip-path style)
5. **Noise Overlay** - Subtle grain effect
6. **Animated Background** - Interactive particle/grid system
7. **Smooth Transitions** - 300ms ease-in-out animations

### Component Styling
- **Buttons:** Angular design with neon borders, glow effects on active state
- **Cards:** Semi-transparent dark backgrounds with neon borders
- **Input Fields:** Glowing borders on focus, monospace font for IDs
- **Progress Bars:** Animated gradient with pulse effect
- **Tabs:** Angular design with active glow and border
- **Modals:** Full-screen or bottom sheet with backdrop blur

---

## 🏗️ App Architecture

### Folder Structure
```
lib/
├── main.dart
├── app/
│   ├── routes/
│   │   └── app_routes.dart
│   ├── theme/
│   │   ├── app_theme.dart
│   │   └── app_colors.dart
│   └── constants/
│       └── app_constants.dart
├── core/
│   ├── services/
│   │   ├── webrtc_service.dart
│   │   ├── peerjs_service.dart
│   │   ├── sftp_service.dart
│   │   └── storage_service.dart
│   ├── models/
│   │   ├── file_transfer.dart
│   │   ├── peer_connection.dart
│   │   ├── sftp_credentials.dart
│   │   └── chat_message.dart
│   └── utils/
│       ├── file_utils.dart
│       ├── crypto_utils.dart
│       └── network_utils.dart
├── features/
│   ├── home/
│   │   ├── views/
│   │   │   └── home_screen.dart
│   │   └── widgets/
│   │       ├── animated_background.dart
│   │       ├── navigation_tabs.dart
│   │       └── status_footer.dart
│   ├── sftp/
│   │   ├── views/
│   │   │   └── sftp_screen.dart
│   │   ├── viewmodels/
│   │   │   └── sftp_viewmodel.dart
│   │   └── widgets/
│   │       ├── sftp_credentials_form.dart
│   │       └── upload_progress_card.dart
│   ├── p2p/
│   │   ├── views/
│   │   │   └── p2p_screen.dart
│   │   ├── viewmodels/
│   │   │   └── p2p_viewmodel.dart
│   │   └── widgets/
│   │       ├── peer_id_display.dart
│   │       ├── file_selector.dart
│   │       ├── transfer_progress.dart
│   │       └── file_preview_modal.dart
│   ├── communication/
│   │   ├── views/
│   │   │   └── communication_screen.dart
│   │   ├── viewmodels/
│   │   │   └── communication_viewmodel.dart
│   │   └── widgets/
│   │       ├── video_renderer_widget.dart
│   │       ├── call_controls.dart
│   │       └── chat_panel.dart
│   └── broadcast/
│       ├── views/
│       │   └── broadcast_screen.dart
│       ├── viewmodels/
│       │   └── broadcast_viewmodel.dart
│       └── widgets/
│           ├── peer_list.dart
│           └── broadcast_message_input.dart
└── shared/
    ├── widgets/
    │   ├── cyberpunk_button.dart
    │   ├── cyberpunk_card.dart
    │   ├── cyberpunk_input.dart
    │   ├── glitch_text.dart
    │   └── loading_indicator.dart
    └── animations/
        ├── scanline_overlay.dart
        └── pulse_glow.dart
```

---

## 📦 Required Flutter Packages

### Core Dependencies
```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  provider: ^6.1.2
  get: ^4.6.6 # Alternative: riverpod
  
  # WebRTC
  flutter_webrtc: ^0.11.6
  
  # Peer-to-Peer
  web_socket_channel: ^3.0.1
  http: ^1.2.1
  
  # SFTP
  dartssh2: ^2.14.0
  
  # File Handling
  file_picker: ^8.0.0
  path_provider: ^2.1.3
  permission_handler: ^11.3.1
  open_file: ^3.3.2
  
  # QR Code
  qr_flutter: ^4.1.0
  mobile_scanner: ^5.1.1
  
  # UI/UX
  google_fonts: ^6.2.1
  flutter_animate: ^4.5.0
  shimmer: ^3.0.0
  
  # Media
  video_player: ^2.8.6
  flutter_pdfview: ^1.3.2
  flutter_syntax_view: ^4.0.0
  
  # Utilities
  uuid: ^4.4.0
  share_plus: ^9.0.0
  url_launcher: ^6.2.6
  intl: ^0.19.0
  
  # Local Storage
  shared_preferences: ^2.2.3
  hive: ^2.2.3
  hive_flutter: ^1.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  hive_generator: ^2.0.1
  build_runner: ^2.4.9
```

---

## 🔧 Technical Implementation Details

### 1. WebRTC Configuration

**Ice Servers:**
```dart
List<Map<String, String>> iceServers = [
  {'urls': 'stun:stun.l.google.com:19302'},
  {'urls': 'stun:global.stun.twilio.com:3478'},
];
```

**RTCPeerConnection Configuration:**
```dart
Map<String, dynamic> configuration = {
  'iceServers': iceServers,
  'sdpSemantics': 'unified-plan',
};
```

### 2. PeerJS Integration

**Connection Setup:**
- Host: Configurable via environment variables
- Port: 443 (production) / 9000 (development)
- Path: /
- Secure: true (for HTTPS)

**For Broadcast Feature:**
- Must use custom PeerJS server with peer listing enabled
- Public server (0.peerjs.com) does NOT support peer listing
- Include peer discovery endpoint: `/peerjs/peers`

### 3. File Transfer Protocol

**Transmitter Flow:**
1. Initialize peer connection
2. Generate unique Peer ID
3. Wait for receiver connection
4. Send file metadata (name, size, mimeType)
5. Chunk file into ArrayBuffers (64KB chunks)
6. Send chunks via data channel
7. Send completion signal
8. Update progress UI

**Receiver Flow:**
1. Connect to transmitter's Peer ID
2. Receive file metadata
3. Allocate buffer for incoming chunks
4. Receive and concatenate chunks
5. Create blob from complete data
6. Show preview or save to storage

**Message Protocol:**
```dart
// P2P Message Types
enum P2PMessageType {
  requestFile,
  fileFound,
  fileData,
  fileChunk,
  fileEnd,
  error,
  chat,
}

class P2PMessage {
  final P2PMessageType type;
  final String? code;
  final String? name;
  final int? size;
  final String? mimeType;
  final Uint8List? data;
  final String? text;
  final int? timestamp;
}
```

### 4. SFTP Implementation

**Connection:**
```dart
final client = SSHClient(
  await SSHSocket.connect(host, port),
  username: username,
  onPasswordRequest: () => password,
);

final sftp = await client.sftp();
```

**Upload:**
```dart
final file = await sftp.open(remotePath, mode: SftpFileOpenMode.write);
await file.writeBytes(fileBytes);
```

### 5. Video Chat Implementation

**Media Stream:**
```dart
final Map<String, dynamic> mediaConstraints = {
  'audio': true,
  'video': {
    'facingMode': 'user',
    'width': {'ideal': 1280},
    'height': {'ideal': 720},
  }
};

final stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
```

**Camera Flip:**
```dart
await Helper.switchCamera(localStream!.getVideoTracks()[0]);
```

---

## 📱 Screen Specifications

### Home Screen
**Components:**
- Animated cyberpunk background (particles/grid)
- Header with app logo and glitch effect
- Status footer (system status, active connections)
- 4 navigation tabs (SFTP, P2P, Communication, Broadcast)
- Tab persistence using SharedPreferences

### SFTP Screen
**Components:**
- Credentials input form (host, username, password)
- Connection status indicator
- File picker button with cyberpunk styling
- Upload progress cards with animated progress bars
- Multi-file queue management
- Error handling with retry option

### P2P Screen
**Components:**
- Mode selector (Transmitter/Receiver) with toggle
- Transmitter View:
  - Peer ID display with copy/share/QR code buttons
  - File selector (multiple files support)
  - Selected files list with remove option
  - "Initiate Upload" button
  - Transfer progress with % and speed
- Receiver View:
  - Peer ID input field
  - QR code scanner button
  - "Connect to Peer" button
  - Incoming files list
  - Preview/Save buttons for each file
  - File preview modal (images, videos, PDFs, code)

### Communication Screen
**Components:**
- Local video feed (picture-in-picture, draggable)
- Remote video feed (full screen)
- Call controls (video toggle, audio toggle, camera flip, end call)
- Connection status overlay
- Text chat panel (expandable from bottom)
- Peer ID display and input

### Broadcast Screen
**Components:**
- "Scan Network" button with animation
- Active peers list with status indicators
- Message input field
- "Send Broadcast" button
- Message history
- Delivery confirmation indicators

---

## 🔐 Security Features

1. **WebRTC Encryption:** All P2P data is encrypted end-to-end (DTLS-SRTP)
2. **No Server Storage:** Files never stored on servers (direct P2P)
3. **Local Processing:** All previews processed client-side
4. **Secure Context:** HTTPS enforced in production
5. **Permission Management:** Request permissions at runtime
6. **Secure Storage:** Use flutter_secure_storage for sensitive data

---

## 📊 Data Models

### FileTransfer
```dart
class FileTransfer {
  final String id;
  final String name;
  final int size;
  final String mimeType;
  final String accessCode;
  double progress;
  TransferStatus status;
  bool isIncoming;
  Uint8List? fileData;
  String? downloadUrl;
}

enum TransferStatus {
  pending,
  uploading,
  downloading,
  completed,
  error,
}
```

### SFTPCredentials
```dart
class SFTPCredentials {
  final String id;
  final String host;
  final String username;
  final String? password;
  final DateTime createdAt;
  final String status;
  final String region;
}
```

### ChatMessage
```dart
class ChatMessage {
  final String id;
  final ChatSender sender;
  final String text;
  final int timestamp;
}

enum ChatSender {
  me,
  peer,
  system,
}
```

### PeerConnection
```dart
class PeerConnection {
  final String peerId;
  final String status;
  final RTCPeerConnection? rtcConnection;
  final MediaStream? stream;
  final DateTime connectedAt;
}
```

---

## 🚦 App Flow Diagrams

### P2P File Transfer Flow
```
Transmitter                          Receiver
    |                                    |
    |--- Generate Peer ID --------------->|
    |                                    |
    |<-- Connect to Peer ID --------------|
    |                                    |
    |--- Send File Metadata ------------->|
    |                                    |
    |--- Send File Chunks --------------->|
    |    (with progress updates)         |
    |                                    |
    |--- Send Completion Signal -------->|
    |                                    |
    |<-- Acknowledge Receipt -------------|
```

### Video Call Flow
```
Caller                              Callee
    |                                  |
    |--- Get User Media ------------->|
    |                                  |
    |--- Create Offer ---------------->|
    |                                  |
    |<-- Create Answer ----------------|
    |                                  |
    |--- Exchange ICE Candidates ----->|
    |<----------------------------------|
    |                                  |
    |=== Media Stream Active =========|
```

---

## 🔌 API & Environment Configuration

### Environment Variables (.env)
```
# Gemini API (Optional - for AI chat features)
GEMINI_API_KEY=your_api_key_here

# WebRTC ICE Servers
ICE_SERVERS=stun:stun.l.google.com:19302,stun:global.stun.twilio.com:3478

# PeerJS Configuration (P2P Share)
PEER_HOST=your-peerjs-server.com
PEER_PORT=443
PEER_PATH=/
PEER_SECURE=true

# Broadcast PeerJS Server (REQUIRED - must support peer listing)
BROADCAST_PEER_HOST=your-app.railway.app
BROADCAST_PEER_PORT=443
BROADCAST_PEER_PATH=/

# Environment
ENV=production
```

### Load Environment Config
```dart
class AppConfig {
  static const String geminiApiKey = String.fromEnvironment('GEMINI_API_KEY', defaultValue: '');
  static const String peerHost = String.fromEnvironment('PEER_HOST', defaultValue: '0.peerjs.com');
  static const int peerPort = int.fromEnvironment('PEER_PORT', defaultValue: 443);
  static const String broadcastPeerHost = String.fromEnvironment('BROADCAST_PEER_HOST', defaultValue: 'localhost');
}
```

---

## 🎯 Key Implementation Challenges & Solutions

### Challenge 1: WebRTC on Mobile
**Solution:** Use `flutter_webrtc` package which provides native WebRTC bindings for iOS and Android

### Challenge 2: File Chunking for Large Files
**Solution:** Implement chunking strategy (64KB chunks) with progress tracking and resume capability

### Challenge 3: Background Processing
**Solution:** Use isolates for encoding/decoding large files to prevent UI blocking

### Challenge 4: Permission Handling
**Solution:** Use `permission_handler` package and request permissions contextually with explanations

### Challenge 5: Network Detection
**Solution:** Implement connectivity monitoring and handle reconnection gracefully

### Challenge 6: Cross-Platform Styling
**Solution:** Create reusable cyberpunk-themed widgets with platform-adaptive behaviors

---

## 📈 Performance Optimization

1. **Lazy Loading:** Load components only when needed
2. **Image Caching:** Cache preview thumbnails
3. **Memory Management:** Dispose streams and controllers properly
4. **Chunked Transfer:** Use optimal chunk sizes for file transfers
5. **Debouncing:** Debounce network scans and UI updates
6. **Background Isolates:** Process large files in background

---

## 🧪 Testing Strategy

1. **Unit Tests:** Test services, utils, and viewmodels
2. **Widget Tests:** Test individual widgets and screens
3. **Integration Tests:** Test complete user flows
4. **Platform Tests:** Test on both iOS and Android devices
5. **Network Tests:** Test various network conditions
6. **Performance Tests:** Test with large files and multiple peers

---

## 📱 Platform-Specific Considerations

### iOS
- Request camera/microphone permissions in Info.plist
- Handle background video constraints
- Use CallKit for native call experience (optional)
- Test with App Store guidelines for P2P apps

### Android
- Request runtime permissions for camera, microphone, storage
- Handle foreground service for ongoing transfers
- Test with different Android versions (API 21+)
- Optimize for different screen sizes and densities

---

## 🚀 Deployment Checklist

### Pre-Release
- [ ] Test on multiple devices (iOS & Android)
- [ ] Test all features (SFTP, P2P, Video, Broadcast)
- [ ] Verify permissions are requested properly
- [ ] Test network error handling
- [ ] Verify file transfers for various sizes
- [ ] Test video quality and performance
- [ ] Check UI on different screen sizes

### App Store Preparation
- [ ] Create app icons (iOS: 1024x1024, Android: various sizes)
- [ ] Create screenshots for both platforms
- [ ] Write app description highlighting features
- [ ] Prepare privacy policy (data handling disclosure)
- [ ] Set up analytics (optional)
- [ ] Configure push notifications (if needed)

### Build Configuration
- [ ] Set proper app bundle ID
- [ ] Configure code signing (iOS)
- [ ] Generate keystore (Android)
- [ ] Set version numbers
- [ ] Configure build variants (debug/release)
- [ ] Enable code obfuscation for release

---

## 🎨 Asset Requirements

### App Icons
- iOS: 1024x1024 (App Store), various sizes for device
- Android: 512x512 (Play Store), various sizes for device
- Style: Cyberpunk theme with neon colors, glitch effect

### Splash Screen
- Size: 1242x2688 (iOS), 1080x1920 (Android)
- Design: FluxShare logo with animated scanlines/glitch effect
- Background: Dark (#050510) with particle effects

### Illustrations
- Empty states for each feature
- Error states
- Success animations
- Loading animations (cyberpunk-themed)

### Fonts
- Orbitron (headers)
- Rajdhani (body text)
- Share Tech Mono (monospace for IDs)

---

## 📚 Additional Features (Future Enhancements)

1. **File Encryption:** End-to-end encryption for stored files
2. **Multi-Peer Transfer:** Send to multiple peers simultaneously
3. **Transfer History:** Track all past transfers
4. **User Profiles:** Create profiles with avatar and display name
5. **Dark/Light Theme:** Toggle between themes
6. **Language Support:** Multi-language localization
7. **Cloud Backup:** Optional backup to cloud storage
8. **Screen Sharing:** Share screen during video calls
9. **Voice Messages:** Record and send voice messages
10. **File Compression:** Compress files before transfer

---

## 🔗 Useful Resources

### Documentation
- Flutter WebRTC: https://pub.dev/packages/flutter_webrtc
- PeerJS: https://peerjs.com/docs/
- SFTP (dartssh2): https://pub.dev/packages/dartssh2

### Design Inspiration
- Cyberpunk 2077 UI
- Neon cyberpunk themes on Dribbble
- Futuristic dashboard designs

### Web API Reference
- WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- MediaStream API: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_API

---

## 📝 Notes

1. **PeerJS Server:** For production, deploy your own PeerJS server (Railway, Render, etc.) as the public server doesn't support peer listing required for Broadcast feature.

2. **File Size Limits:** Test and document file size limits based on device memory and network constraints.

3. **Battery Optimization:** Implement battery-friendly strategies for background operations.

4. **Network Types:** Handle different network types (WiFi, Cellular, Bluetooth) appropriately.

5. **Error Recovery:** Implement robust error handling and recovery mechanisms for network failures.

6. **User Feedback:** Provide clear feedback for all user actions and system states.

---

**Built with ❤️ for the Cyberpunk Era**  
*Ready to revolutionize file sharing on mobile!*

const { PeerServer } = require('peer');

const port = 9000;

const peerServer = PeerServer({
    port: port,
    path: '/',
    allow_discovery: true,
    proxied: true // Useful if behind a proxy, harmless otherwise
});

console.log(`
🚀 Local PeerJS Server running on port ${port}
📡 Discovery enabled: true
🔗 Endpoint: http://localhost:${port}
`);

peerServer.on('connection', (client) => {
    console.log(`Client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
    console.log(`Client disconnected: ${client.getId()}`);
});

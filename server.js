const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
console.log("Starting on port 8080");

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    console.log("Recieved Message");

    // Broadcast to everyone else.
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

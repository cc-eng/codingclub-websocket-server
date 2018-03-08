const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
console.log("Starting on port 8080");

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    var msg;

    try {
      msg = JSON.parse(data):
    } catch (err) {
      console.log(err);
      return;
    }

    console.log("Recieved message " + data);

    // Broadcast to everyone else.
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });
});

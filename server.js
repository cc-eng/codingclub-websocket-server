const WebSocket = require('ws');
const fs = require('fs');


function tryFile(path, resolve, reject, ifnotfile) {
  fs.stat(path, function (err, stat) {
    if (err) return ifnotfile();

    fs.readFile(path, function (err, data) {
      if (err) return reject(err);

      resolve(JSON.parse(data));
    });

  });
}


class Config {
  constructor() {
    this.cPromise = new Promise(function (resolve, reject) {
      tryFile("/etc/codingclub/config.json", resolve, reject, function () {
        tryFile("./config.json", resolve, reject, function () { resolve({}) });
      });
    });
  }

  ready(callback) {
    this.cPromise.then(callback, function (err) { console.log(err) });
  }
}

class Server {
  constructor(ops) {
    this.port = ops.port;
    this.authtoken = ops.authtoken;
    if (!this.authtoken) console.log("Warning this server is not secured!");
  }

  clean(data) {
    var out = {};

    Object.keys(data).forEach(function (k) {
      if (k != "authtoken")  out[k] = data[k];
    });

    return out;
  }

  send(client, msg) {
    console.log("Sending " + JSON.stringify(msg));
    client.send(JSON.stringify(msg));
  }

  broadcast(sender, msg) {
    this.wss.clients.forEach(function (client) {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        this.send(client, msg);
      }
    }.bind(this));
  }

  get wss() {
    if (!this._wss) {
      console.log("Starting on port " + this.port);
      this._wss = new WebSocket.Server({ port: this.port});
    }

    return this._wss;
  }

  start() {
    this.wss.on('connection', function (ws) {
      ws.on('message', function (data) {
        try {
          var rawMsg = JSON.parse(data);
          var msg = this.clean(rawMsg);
        } catch (err) {
          return console.log(err);
        }

        console.log("Recieved message " + JSON.stringify(msg));

        if (this.authtoken != rawMsg.authtoken) {
          console.log("Authentication Failed")
          return this.send(ws, {"error": "Invalid Auth Token"});
        }

        this.broadcast(ws, msg);

      }.bind(this)); // end on message
    }.bind(this)); // end on connection
  }
}

/* Start Server */

new Config().ready(function (ops) {
  new Server({
    port: ops.port || 8080,
    authtoken: ops.authtoken
  }).start();
})

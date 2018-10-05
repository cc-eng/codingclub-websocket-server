"use strict";

const WebSocket = require('ws');
const fs = require('fs');

const CONFIG_PATHS = [
  "/etc/codingclub/config.json",
  "./config.json",
];

class ChannelBroker {
  constructor() {
    this.channels = {};
  }

  getClients(name) {
    if (!this.channels[name]) {
      this.channels[name] = [];
    }

    return this.channels[name];
  }

  addToChannel(name, client) {
    console.log("Adding client to " + name);
    var clients = this.getClients(name);

    if (clients.indexOf(client) > -1) {
      console.log("Client already in channel!");
      return;
    }

    clients.push(client);
  }

  removeFromChannel(name, client) {
    var clients = this.getClients(name);
    var i = clients.indexOf(client);

    if (i > -1) {
      clients.splice(i, 1);
    }
  }

  removeFromAll(client) {
    var channelNames = Object.keys(this.channels);

    for (var i = 0; i < channelNames.length; i++) {
      this.removeFromChannel(channelNames[i], client);
    }
  }
}


class Config {
  constructor() {
    /* Defaults */
    this.port = 8080

    /* Pull in values from the config file*/
    for (var i = 0; i < CONFIG_PATHS.length; i++) {
      if (fs.existsSync(CONFIG_PATHS[i])) {
        console.log("Using config from: " + CONFIG_PATHS[i]);
        Object.assign(this, JSON.parse(fs.readFileSync(CONFIG_PATHS[i])));
        break;
      }
    }
  }
}


class Server {
  constructor(config) {
    this.config = config;
    this.channels = new ChannelBroker();

    if (!this.config.authtoken) {
      console.log("Warning this server is not secured!");
    }
  }

  cleanMsg(data) {
    var cleaned = Object.assign({}, data);
    delete cleaned["authtoken"];
    return cleaned;
  }

  send(client, msg) {
    console.log("Sending " + JSON.stringify(msg));
    client.send(JSON.stringify(msg));
  }

  broadcast(sender, clients, msg) {
    clients.forEach(function(client) {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        this.send(client, msg);
      }
    }.bind(this));
  }

  handleCommand(client, command) {
    console.log("Handeling command " + JSON.stringify(command));

    try {
      var name = command.name.toLowerCase();

      if (name == "join" && command.channel) {
          this.channels.addToChannel(command.channel, client);
      }
    } catch (e) {
      console.log(e);
    }
  }

  handleClient(client) {
    client.on('close', function () {
      console.log("Client disconnected");
      this.channels.removeFromAll(client);
    }.bind(this));

    client.on('message', function (data) {
      try {
        var rawMsg = JSON.parse(data);
        var msg = this.cleanMsg(rawMsg);
      } catch (err) {
        return console.log(err);
      }

      console.log("Recieved message " + JSON.stringify(msg));

      if (this.config.authtoken != rawMsg.authtoken) {
        console.log("Authentication Failed")
        return this.send(client, {"error": "Invalid Auth Token"});
      }

      if (msg.command) {
        return this.handleCommand(client, msg.command);
      }

      if (msg.channel) {
        console.log("Sending to channel");
        this.broadcast(client, this.channels.getClients(msg.channel), msg);
      } else {
        console.log("Sending to all");
        this.broadcast(client, this.wss.clients, msg);
      }
    }.bind(this));
  }

  start() {
    console.log("Starting on port " + this.config.port);
    this.wss = new WebSocket.Server({
      port: this.config.port
    });

    this.wss.on('connection', client => this.handleClient(client));
  }
}

/* Start Server */

new Server(new Config()).start();

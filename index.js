'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var https = require('https');
var socketIO = require('socket.io');
var fs = require("fs");
var options = {
  key: fs.readFileSync('/var/webuzo/lets_encrypt/track.harismawan.com/track.harismawan.com.key'),
  cert: fs.readFileSync('/var/webuzo/lets_encrypt/track.harismawan.com/fullchain.cer')
};

var fileServer = new (nodeStatic.Server)();
var app = https.createServer(options, function (req, res) {
  fileServer.serve(req, res);

}).listen(1794);

var stream = [];

var io = socketIO.listen(app);
io.sockets.on('connection', function (socket) {

  var roomObject = {
    name: String,
    client: Number
  }

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function (message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function (room) {
    log('Received request to create or join room ' + room);

    var index = 0;
    var c = false;
    for (var i = 0; i < stream.length; i++) {
      if (stream[i].name === room) {
        roomObject = stream[i];
        index = i;
        c = true;
        break;
      }
    }

    if (!c) {
      roomObject.name = room;
      roomObject.client = 1;
      index = stream.length;
      stream.push(room);
    }

    var numClients = roomObject.client;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 1) {
      stream[index].client = stream[index].client + 1;
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
    } else if (numClients < 5) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      stream[index].client = stream[index].client + 1;
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max 5 clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function () {
    console.log('received bye');

  });

});

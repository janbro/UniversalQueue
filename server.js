const express = require('express'),
  fs = require('fs'),
  func = require('./js/serverfunctions'),
  urlParser = require('url'),
  http = require('http');
var app = express();

const hostname = process.env.IP;
const port = process.env.PORT;

var roomKeys = [];

app.get('/', function (req, res) {
  fs.readFile("index.html", function (err, data) {
    if(err){
      res.writeHead(404);
      res.write("Not Found!");
    }
    else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(fs.readFileSync('index.html'));
    }
    res.end();
  });
});

app.get("/createRoom", function(req, res) {
  var accessCode = func.generateAccessCode();  
  roomKeys.push(accessCode);
  res.writeHead(302,
    {
      Location: '/host?roomCode=' + accessCode
    }
  );
  res.end();
});

app.get("/host", function(req, res) {
  var roomCode = urlParser.parse(req.url,true).query['roomCode'];
  if(roomKeys.indexOf(roomCode) != -1) {
    fs.readFile("./host/host.html", function (err, data) {
    if(err){
      res.writeHead(404);
      res.write("Not Found!");
    }
    else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(fs.readFileSync('./host/host.html'));
    }
    res.end();
    });
  }
  else {
    res.writeHead(302,
      {
        Location: '/error?reason=Room creation failed!'
      }
    );
    res.end();
  }
});

app.get("/user", function(req, res) {
  // add user to room and add to room count
  var roomCode = urlParser.parse(req.url,true).query['roomCode'];
  if(roomKeys.indexOf(roomCode) != -1) {
    fs.readFile("./client/client.html", function (err, data) {
      if(err){
        res.writeHead(404);
        res.write("Not Found!");
      }
      else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(fs.readFileSync('./client/client.html'));
      }
      res.end();
    });
  }
  else {
    res.writeHead(302,
      {
        Location: '/error?reason=Room does not exist!'
      }
    );
    res.end();
  }
});

app.get("/error", function(req, res) {
  fs.readFile("error.html", function (err, data) {
    if(err){
      res.writeHead(404);
      res.write("Not Found!");
    }
    else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(fs.readFileSync('error.html'));
    }
    res.end();
   });
});

app.use(function(req, res) {
  res.writeHead(302,
    {
      Location: '/error?reason=Page does not exist!'
    }
  );
  res.end();
});

app.get(/^\/[a-zA-Z0-9\/]*.css$/, function(req, res) {
  func.sendFileContent(res, req.url.toString().substring(1), "text/css");
});

app.get(/^\/[a-zA-Z0-9\/]*.html$/, function(req, res) {
  func.sendFileContent(res, req.url.toString().substring(1), "text/html");
});

app.get(/^\/[a-zA-Z0-9\/]*.js$/, function(req, res) {
  func.sendFileContent(res, req.url.toString().substring(1), "text/javascript");
});

var server = http.createServer(app);
var io = require('socket.io')(server);

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

io.on('connection', function (socket) {
  console.log("User has connected!");
  
  socket.on('disconnect', function(){
    //Disconnect user from room depending on if host or user
    console.log("User has disconnected!");
  });
  
  socket.on('killRoom', function(room) {
    console.log(roomKeys);
    socket.leave(room);
    var index = roomKeys.indexOf(room);
    if (index > -1) {
      roomKeys.splice(index, 1);
    }
    console.log(roomKeys);
		socket.leave(socket.room);
  });
  
  socket.on('hostJoin', function (room) {
    if(roomKeys.indexOf(room) != -1) {
      socket.username = "host";
      socket.room = room;
      socket.join(room);
      console.log("Host has joined room " + room);
    }
    else {
      socket.emit('badRoom');
    }
  });
  
  socket.on('leaveRoom', function (user, room) {
    if(roomKeys.indexOf(room) != -1) {
      socket.broadcast.to(room).emit('removeUser',user);
      console.log(user + " has left room " + room);
	  	socket.leave(socket.room);
    }
  });
  
  socket.on('joinRoom', function (user, room) {
    if(roomKeys.indexOf(room) != -1) {
      socket.username = user;
      socket.room = room;
      socket.join(room);
      socket.broadcast.to(room).emit('addUser',user);
      console.log(user + " has joined room " + room);
    }
    else {
      socket.emit('badRoom');
    }
  });
  
  socket.on('addMedia', function (media,room) {
    if(roomKeys.indexOf(room) != -1) {
      socket.broadcast.to(room).emit('addMedia',media);
      console.log(media + " has been added to room " + room);
    }
  });
});
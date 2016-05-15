const express = require('express'),
  fs = require('fs'),
  func = require('./js/serverfunctions'),
  urlParser = require('url');
var app = express();

const hostname = process.env.IP;
const port = process.env.PORT;

var gameRoomKeys = [];

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
  gameRoomKeys.push(accessCode);
  res.writeHead(302,
    {
      Location: '/host?roomCode=' + accessCode
    }
  );
  res.end();
});

app.get("/host", function(req, res) {
  var roomCode = urlParser.parse(req.url,true).query['roomCode'];
  if(gameRoomKeys.indexOf(roomCode) != -1) {
    fs.readFile("host.html", function (err, data) {
    if(err){
      res.writeHead(404);
      res.write("Not Found!");
    }
    else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(fs.readFileSync('host.html'));
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

app.get(/^\/[a-zA-Z0-9\/]*.js$/, function(req, res) {
  func.sendFileContent(res, req.url.toString().substring(1), "text/css");
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
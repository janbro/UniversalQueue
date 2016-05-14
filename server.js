const http = require('http');
var fs = require('fs');
var urlParser = require('url');

const hostname = process.env.IP;
const port = process.env.PORT;

var gameRoomKeys = [];

const server = http.createServer((req, res) => {
  if(req.url === "/"){
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
  }
  else if(/^\/[a-zA-Z0-9\/]*.css$/.test(req.url.toString())) {
    sendFileContent(res, req.url.toString().substring(1), "text/css");
  }
  else if(req.url === "/createRoom") {
    var accessCode = generateAccessCode();
    gameRoomKeys.push(accessCode);
    res.writeHead(302,
      {
        Location: '/host?roomCode=' + accessCode
      }
    );
    res.end();
  }
  else if(req.url.indexOf("host") != -1) {
    var roomCode = urlParser.parse(req.url,true).query['roomCode'];
    if(gameRoomKeys.indexOf(roomCode) != -1) {
      res.end();
    }
    else {
      res.writeHead(302,
        {
          Location: '/error.html?reason=Room creation failed!'
        }
      );
      res.end();
    }
  }
  else if(req.url.indexOf("error") != -1) {
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
  }
  else {
    res.writeHead(302,
      {
        Location: '/error.html?reason=Page does not exist!'
      }
    );
    res.end();
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
 
function sendFileContent(response, fileName, contentType){
  fs.readFile(fileName, function(err, data){
    if(err){
      response.writeHead(404);
      response.write("Not Found!");
    }
    else{
      response.writeHead(200, {'Content-Type': contentType});
      response.write(data);
    }
    response.end();
  });
}

function generateAccessCode(){
  var code = "";
  var possible = "abcdefghijklmnopqrstuvwxyz";

    for(var i=0; i < 6; i++){
      code += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return code;
}
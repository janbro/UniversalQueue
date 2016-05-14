const http = require('http');
var fs = require('fs');

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
    res.writeHead(302, {
      'Location': accessCode + '/host.html'
      //add other headers here...
    });
    res.end();
  }
  else if(req.url === /host/) {
    
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
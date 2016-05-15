var socket = io();
var roomID = getUrlParameter('roomCode');
var users = [];
var mediaQueue = [];
//Watch for changes
mediaQueue.push = function() { Array.prototype.push.apply(this, arguments);  updateMediaView();};

var updateMediaView = function() {
    //$("media-container").load
};

socket.emit('hostJoin',roomID);

socket.on('addMedia', function(media) {
    mediaQueue.push(media);
    console.log(media = " was added to the queue");
});

socket.on('skip', function() {
   mediaQueue.shift();
});

socket.on('addUser', function(user) {
    users.push(user);
    console.log(users);
});

socket.on('removeUser', function(user) {
    var index = users.indexOf(user);
    if (index > -1) {
      users.splice(index, 1);
    }
    console.log(users);
});

window.onbeforeunload = function() {
    socket.emit('killRoom',roomID);
};
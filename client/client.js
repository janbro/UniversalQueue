var socket = io();
var userID = getUrlParameter('user');
var roomID = getUrlParameter('roomCode');

socket.emit('joinRoom',userID,roomID);

$('#send-alive').click(function() {
   socket.emit('alive', userID);
   return false;
});

$('#broadcast-alive').click(function() {
   socket.emit('broadcast-alive', userID, roomID);
   return false;
});

socket.on('badRoom', function() {
    location.href = '/error?reason=That room does not exist!';
});

window.onbeforeunload = function() {
    socket.emit('leaveRoom',userID,roomID);
};
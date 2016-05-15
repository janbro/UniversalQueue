var socket = io();
var userID = getUrlParameter('user');
var roomID = getUrlParameter('roomCode');

socket.emit('joinRoom',userID,roomID);
$("#roomCode").append(roomID);
$("#userName").append(userID);

$('#skip-button').click(function() {
   socket.emit('skipMedia', userID, roomID);
   $('#skip-button').removeClass('skip-button').addClass('skip-button-grey');
   return false;
});

socket.on('badRoom', function() {
    location.href = '/error?reason=That room does not exist!';
});

socket.on('roomClosed', function() {
    location.href = '/error?reason=The room has closed';
});

socket.on('updateMediaLists', function(mediaSites,mediaLinks,mediaTitles){
   $('#skip-button').removeClass('skip-button-grey').addClass('skip-button');
   $('#now-playing').empty();
   if(mediaTitles[0] === undefined) {
       $('#now-playing').append("&#9658; Now Playing: ");
   }
   else {
       $('#now-playing').append("&#9658; Now Playing: " + mediaTitles[0]);
   }
});

socket.on('updateMediaLists', function(mediaSites,mediaLinks,mediaTitles) {
    console.log(mediaTitles);
    $('#queued').empty();
    for(var i=1;i<mediaTitles.length;i++){
        $('#queued').append("<li>"+mediaTitles[i]+"</li>")
    }
});

function sendToQueue(site,mediaTitle,mediaLink) {
  socket.emit('addMedia',site,mediaLink,mediaTitle,roomID);
  $('#search-container').empty();
  $('#query').val('');
}

function showError(identif) {
    $(identif).addClass('highlight');
    setTimeout(function() {
        $(identif).addClass('fade').removeClass('highlight');
        setTimeout(function() {
            $(identif).removeClass('fade');
        },1000);
    },2000);
}

window.onbeforeunload = function() {
    socket.emit('leaveRoom',userID,roomID);
};
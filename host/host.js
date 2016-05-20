var socket = io();
var roomID = getUrlParameter('roomCode');
var users = [];
var userSkips = [];
var mediaSites = [];
var mediaLinks = [];
var mediaTitles = [];
var intervalSync;
//Watch for changes

if (screen.width <= 480) {
  alert("This page is designed for desktop or tablet devices!");
}
window.onbeforeunload = function() {
  return "Leaving this page will close your room!";
};

socket.emit('hostJoin', roomID);

$("#roomCode").append(roomID);

socket.on('addMedia', function(mediaSite, mediaLink, mediaTitle) {
  mediaSites.push(mediaSite);
  mediaLinks.push(mediaLink);
  mediaTitles.push(mediaTitle);
  //console.log(mediaTitle + " was added to the queue");
  socket.emit('updateMediaLists', mediaSites, mediaLinks, mediaTitles);
  if (mediaTitles.length === 1) {
    updateMediaView();
  }
});

socket.on('updateMediaLists', function(mediaSites, mediaLinks, mediaTitles) {
  this.mediaSites = mediaSites;
  this.mediaLinks = mediaLinks;
  this.mediaTitles = mediaTitles;
});

socket.on('skipMedia', function(user) {
  if (userSkips.indexOf(user) === -1) {
    userSkips.push(user);
  }
  if (userSkips.length >= Math.ceil((2 / 3) * users.length)) {
    nextMedia();
  }
  updateSkips();
});

socket.on('addUser', function(user) {
  users.push(user);
  //console.log(users);
  socket.emit('updateMediaLists', mediaSites, mediaLinks, mediaTitles);
  if (mediaSites[0] === "YouTube") {
    socket.emit('joinInfo', player.getCurrentTime(), player.getPlayerState());
  }
  console.log(mediaLinks);
  updateActiveUsers();
  socket.emit('updateActiveUsers', users);
});

socket.on('removeUser', function(userID, user) {
  var index = users.indexOf(user);
  if (index > -1) {
    users.splice(index, 1);
    updateActiveUsers();
  }
  var index = userSkips.indexOf(userID);
  if (index > -1) {
    userSkips.splice(index, 1);
    updateSkips();
  }
  //console.log(userSkips);
});

socket.on('badRoom', function() {
  window.onbeforeunload = function() {

  };
  location.href = '/error?reason=Room no longer exists!';
});

socket.on('pauseMedia', function() {
  player.pauseVideo();
});

socket.on('playMedia', function() {
  player.playVideo();
});

var player;

function onPlayerReady(event) {
  event.target.setVolume(100);
  event.target.playVideo();
  event.target.setPlaybackQuality('default');
}

function onPlayerStateChange(event) {
  if (event.data === 0) {
    nextMedia();
  }
  else if (event.data === 1) {
    socket.emit('playMedia');
  }
  else if (event.data === 2 || event.data === 3) {
    socket.emit('pauseMedia');
  }
  socket.emit('seekTo', player.getCurrentTime());
}

function nextMedia() {
  userSkips = [];
  mediaSites.shift();
  mediaLinks.shift();
  mediaTitles.shift();
  socket.emit('nextMedia');
  socket.emit('updateMediaLists', mediaSites, mediaLinks, mediaTitles);
  clearSkips();
  updateMediaView();
}

function updateActiveUsers() {
  $('#active-users').empty();
  for (var i = 0; i < users.length; i++) {
    $('#active-users').append("<li>" + users[i] + "</li>");
  }
  updateSkips();
}

function updateSkips() {
  $('#skips').empty();
  $('#skips').append("SKIPS: " + userSkips.length + "/" + Math.ceil((2 / 3) * users.length));
  socket.emit('updateSkipCount', userSkips.length, Math.ceil((2 / 3) * users.length));
}

function clearSkips() {
  userSkips = [];
  updateSkips();
}
OE = "";

function updateMediaView() {
  $("#player").attr('class', '');
  $("#player-container").empty();
  $("#player-container").append("<div id='player'></div>");
  clearInterval(intervalSync);
  switch (mediaSites[0]) {
    case "SoundCloud":
      SC.oEmbed(mediaLinks[0], {
        auto_play: true,
        maxheight: 166,
        element: document.getElementById("player")
      }).then(function() {
        document.getElementById("player").getElementsByTagName('iframe')[0].id = 'widget';
        var widget = SC.Widget('widget');
        widget.bind(SC.Widget.Events.READY, function(player) {
          widget.bind(SC.Widget.Events.FINISH, function(player) {
            //console.log("finished");
            nextMedia();
          });
        });
      });
      // .then(function(oEmbed){
      //   OE=oEmbed;
      //   oEmbed.attr('id','widget');
      //   $(oEmbed.html).appendTo('#player');
      //   console.log($('#widget'));
      //   var widget = SC.Widget('widget');
      //   widget.bind(SC.Widget.Events.READY, function(player) {
      //     widget.bind(SC.Widget.Events.FINISH, function(player) {
      //       console.log("finished");
      //       nextMedia();
      //     });
      //   });
      // });
      break;
    case "YouTube":
      //console.log("YouTube");
      player = new YT.Player('player', {
        width: 854,
        height: 480,
        style: "display: block;margin-left: auto;margin-right: auto;",
        videoId: mediaLinks[0],
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
        },
        playerVars: {
            'iv_load_policy': 3,
        }
      });
      intervalSync = setInterval(function(){
        socket.emit('seekTo', player.getCurrentTime());
      },500);
      // document.getElementById('player').setAttribute("class","video-container");
      // $('#player').append('<iframe id="player" style="display: block;margin-left: auto;margin-right: auto;" type="text/html" width="854" height="480" src="http://www.youtube.com/embed/<?php if(file("songs-queued.txt")!=NULL){echo trim(preg_replace('/\s+/', ' ', $songInfo[1]));}?>?enablejsapi=1" frameborder="0"></iframe>');
      break;
    default:
      document.getElementById('player-container').innerHTML = "<div class='dummy-player-content' id='player'> <div class='spacer' style='clear: both;height:35%' ></div><h2>ADD MEDIA TO THE QUEUE!<br>ROOM CODE: " + roomID + "</h2></div>";
      break;
  }
};
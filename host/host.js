var socket = io();
var roomID = getUrlParameter('roomCode');
var username = getUrlParameter('user');
if (!username) {username = "Host";}
var users = [];
var userSkips = [];
var mediaSites = [];
var mediaLinks = [];
var mediaTitles = [];
var vidPlayState = true;
var startTime = null;
var initialPlayerState = 2;
var intervalSync;
var isHost = username.match(/Host/);

if (screen.width <= 480) {
  alert("This page is designed for desktop or tablet devices!");
}

window.onbeforeunload = function() {
  if (isHost) {
    return "Leaving this page will close your room!";
  }
};

if (isHost) {
  socket.emit('hostJoin', roomID);
  $("#button-container").html('<button style="float:right;" onclick="nextMedia()">NEXT</button>');
}
else {
  socket.emit('joinRoomHostView', username, roomID);
  $("#button-container").html('<button id="skip-button" style="float:right;" >SKIP</button>');
}

$("#roomCode").append(roomID);
$("#userName").append(username);

socket.on('addMedia', function(mediaSite, mediaLink, mediaTitle) {
  mediaSites.push(mediaSite);
  mediaLinks.push(mediaLink);
  mediaTitles.push(mediaTitle);
  socket.emit('updateMediaLists', mediaSites, mediaLinks, mediaTitles);
  if (mediaTitles.length === 1) {
    updateMediaView();
  }
});

socket.on('addUser', function(user) {
  users.push(user);
  socket.emit('updateMediaLists', mediaSites, mediaLinks, mediaTitles);
  if (isHost && mediaSites[0] === "YouTube") {
    socket.emit('joinInfo', player.getCurrentTime(), player.getPlayerState());
  }
  console.log(mediaLinks);
  updateActiveUsers();
  socket.emit('updateActiveUsers', users);
});

socket.on('badRoom', function() {
  window.onbeforeunload = function() {}
  location.href = '/error?reason=Room no longer exists!';
});

socket.on('joinInfo', function(seconds, playerState) {
  startTime = seconds;
  initialPlayerState = playerState;
});

socket.on('nextMedia', function() {
  $('#skip-button').removeClass('skip-button-grey').addClass('skip-button');
  nextMedia();
});

socket.on('pauseMedia', function() {
  if (mediaSites[0] === "YouTube") {
    player.pauseVideo();
  }
  vidPlayState = false;
});

socket.on('playMedia', function() {
  if (mediaSites[0] === "YouTube") {
    player.playVideo();
  }
  vidPlayState = true;
});

socket.on('roomClosed', function() {
  location.href = '/error?reason=The room has closed';
});

socket.on('seekTo', function(seconds) {
  if (mediaSites[0] === "YouTube") {
    if(player) {
      if( player.getPlayerState() !== 2) {
        if (Math.abs(player.getCurrentTime() - seconds) > 1) {
          player.seekTo(seconds, true);
        }
      }
    }
    else {
      updateMediaView();
    }
  }
});

socket.on('skipMedia', function(user) {
  console.log("SKIP");
  if (userSkips.indexOf(user) === -1) {
    userSkips.push(user);
  }
  console.log(userSkips);
  if (userSkips.length >= Math.ceil((2 / 3) * users.length)) {
    nextMedia();
  }
  updateSkips();
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
});

socket.on('updateActiveUsers', function(usersTemp) {
  users = usersTemp;
  updateActiveUsers();
});

socket.on('updateMediaLists', function(tempMediaSites, tempMediaLinks, tempMediaTitles) {
  mediaSites = tempMediaSites;
  mediaLinks = tempMediaLinks;
  mediaTitles = tempMediaTitles;
});

socket.on('updateSkipCount', function(skips, skipTarget) {
  $('#skips').empty();
  $('#skips').append("SKIPS: " + skips + "/" + skipTarget);
});

$('#skip-button').click(function() {
  socket.emit('skipMedia', socket.id);
  $('#skip-button').removeClass('skip-button').addClass('skip-button-grey');
  return false;
});

var player;

function clearSkips() {
  userSkips = [];
  $('#skips').empty();
  $('#skips').append("SKIPS: " + userSkips.length + "/" + Math.ceil((2 / 3) * users.length));
  socket.emit('updateSkipCount', userSkips.length, Math.ceil((2 / 3) * users.length));
}

function nextMedia() {
  userSkips = [];
  mediaSites.shift();
  mediaLinks.shift();
  mediaTitles.shift();
  if (isHost) {
    socket.emit('nextMedia');
    socket.emit('updateMediaLists', mediaSites, mediaLinks, mediaTitles);
  }
  clearSkips();
  updateMediaView();
}

function onPlayerReady(event) {
  event.target.setVolume(100);
  event.target.playVideo();
  event.target.setPlaybackQuality('default');
  if (!isHost) {
    setPlayerState();
  }
}

function onPlayerStateChange(event) {
  if (event.data === 0) {
    nextMedia();
  }
  else if (event.data === 1) {
    if (isHost) {
      socket.emit('playMedia');
    }
    else {
      if (!vidPlayState) {
        player.pauseVideo();
      }
    }
  }
  else if (event.data === 2 || event.data === 3) {
    if (isHost) {
      socket.emit('pauseMedia');
    }
  }
  if (isHost) {
    socket.emit('seekTo', player.getCurrentTime());
  }
}

function sendToQueue(site, mediaTitle, mediaLink) {
  socket.emit('addMedia', site, mediaLink, mediaTitle);
  $('#search-container').empty();
  $('#query').val('');
}

function setPlayerState() {
  if (!startTime) {
    setTimeout(setPlayerState, 100);
  }
  else {
    vidPlayState = initialPlayerState === 1;
    if(mediaSites[0] === "YouTube") {
      player.seekTo(startTime, true);
      if (initialPlayerState === 1) {
        player.playVideo();
      }
      else if (initialPlayerState === 2 || initialPlayerState === 3) {
        player.pauseVideo();
      }
    }
  }
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
  console.log(userSkips);
  $('#skips').append("SKIPS: " + userSkips.length + "/" + Math.ceil((2 / 3) * users.length));
  socket.emit('updateSkipCount', userSkips.length, Math.ceil((2 / 3) * users.length));
  if (userSkips.length !== 0 && userSkips.length >= Math.ceil((2 / 3) * users.length)) {
    nextMedia();
  }
}

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
            nextMedia();
          });
        });
      });
      break;
    case "YouTube":
      var playerVars;
      if(isHost) {
        playerVars= {
          'iv_load_policy': 3,
        }
      }
      else {
        playerVars = {
          'controls': 0,
          'iv_load_policy': 3,
          'disablekb': 0
        }
      }
      player = new YT.Player('player', {
        width: 854,
        height: 480,
        style: "display: block;margin-left: auto;margin-right: auto;",
        videoId: mediaLinks[0],
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
        },
        playerVars: playerVars
      });
      if(isHost) {
        intervalSync = setInterval(function() {
          socket.emit('seekTo', player.getCurrentTime());
        }, 500);
      }
      break;
    default:
      document.getElementById('player-container').innerHTML = "<div class='dummy-player-content' id='player'> <div class='spacer' style='clear: both;height:35%' ></div><h2>ADD MEDIA TO THE QUEUE!<br>ROOM CODE: " + roomID + "</h2></div>";
      break;
  }
};

function search() {
  var q = $('#query').val();
  $('#search-container').empty();
  var site = $('#search-site option:selected').html();
  switch (site) {
    case 'YouTube':
      //Search Youtube
      var request;
      gapi.client.setApiKey('AIzaSyAeE-VrCNPnoIPN533Fm39OBIO2oEAhsL4');
      gapi.client.load('youtube', 'v3').then(function() {
        request = gapi.client.youtube.search.list({
          q: q,
          part: 'id, snippet',
          type: 'video',
          order: 'relevance',
          maxResults: '10',
          videoEmbeddable: 'true'
        });
        request.execute(function(response) {
          var str = JSON.stringify(response.result);
          for (var i = 0; i < response.result.items.length; i++) {
            $('#search-container').append('<iframe class="u-full-width" id="player" style="display: block;margin-left: auto;margin-right: auto;" src="https://www.youtube.com/embed/' + response.result.items[i].id.videoId + '?enablejsapi=1" frameborder="0"></iframe>');
            $('<button class="queue-button" id="queue_track" type="submit" style="float:right;" onclick="sendToQueue(\'YouTube\',\'' + response.result.items[i].snippet.title.replace(/'/g, "\\'") + '\',\'' + response.result.items[i].id.videoId.replace(/'/g, "\\'") + '\')">Send to Queue</button>').appendTo('#search-container');
          }
        });
      });
      break;
    case 'SoundCloud':
      //Search SoundCloud
      SC.initialize({
        client_id: '2aa453bf6ef372ab4f7462d76cf01197'
      });

      SC.get('/tracks', {
        q: q,
        limit: 10,
      }).then(function(tracks) {
        var none = true;
        for (var i = 0; i < tracks.length; i++) {
          $('#search-container').append('<div class="search-result-container"><div class="search-dummy-container" id="dummy-content' + i + '"></div><div id="button-container' + i + '"></div></div>');
        }
        for (var i = 0; i < tracks.length; i++) {
          if (tracks[i].embeddable_by == 'all') {
            console.log("#dummy-content" + i);
            var track_url = tracks[i].permalink_url;
            SC.oEmbed(track_url, {
              element: document.getElementById("dummy-content" + i),
              auto_play: false,
              maxheight: 100
            });
            $("#button-container" + i).append('<button class="queue-button" id="queue_track" type="submit" style="float:right;" onclick="sendToQueue(\'SoundCloud\',\'' + tracks[i].title.replace(/'/g, "\\'") + '\',\'' + track_url.replace(/'/g, "\\'") + '\')">Send to Queue</button>');
            none = false;
          }
        }
        if (none) {
          $('#search-container').append('No results found!');
        }
      });
      break;
    case 'Spotify':
      //TODO: Search Spotify
      break;
  }
}
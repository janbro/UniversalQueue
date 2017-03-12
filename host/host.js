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

function sendToQueue(site, mediaTitle, mediaLink) {
    socket.emit('addMedia', site, mediaLink, mediaTitle);
    $('#search-container').empty();
    $('#query').val('');
}

// Search for a specified string.
function search() {
  var q = $('#query').val();
  $('#search-container').empty();
  var site=$('#search-site option:selected').html();
  switch(site){
    case 'YouTube':
      //Search Youtube
      var request;
      gapi.client.setApiKey('AIzaSyAeE-VrCNPnoIPN533Fm39OBIO2oEAhsL4');
      gapi.client.load('youtube', 'v3').then(function() {
        request = gapi.client.youtube.search.list({
          q: q, //old one was without quotes
          part: 'id, snippet', //the parts should be in quotes as well
          type: 'video',
          order: 'relevance',
          maxResults: '10',
          videoEmbeddable: 'true'
        });
        request.execute(function(response) {
          var str = JSON.stringify(response.result);
          for(var i=0;i<response.result.items.length;i++){
            // $("<p>"+response.result.items[i].snippet.title+"</p>").appendTo('#search-container');
            //document.getElementById('search-container').setAttribute("class","video-container");
            $('#search-container').append('<iframe class="u-full-width" id="player" style="display: block;margin-left: auto;margin-right: auto;" src="https://www.youtube.com/embed/'+response.result.items[i].id.videoId+'?enablejsapi=1" frameborder="0"></iframe>');
            $('<button class="queue-button" id="queue_track" type="submit" style="float:right;" onclick="sendToQueue(\'YouTube\',\'' +  response.result.items[i].snippet.title.replace(/'/g,"\\'").replace(/"/g,"\\\"") + '\',\'' + response.result.items[i].id.videoId.replace(/'/g,"\\'") +'\')">Send to Queue</button>').appendTo('#search-container');
          }
        });
      });
      break;
    case 'SoundCloud':
      //Search SoundCloud
      SC.initialize({
        client_id: '2aa453bf6ef372ab4f7462d76cf01197'
      });

      // find all sounds of buskers licensed under 'creative commons share alike'
      SC.get('/tracks', {
        q: q,
        limit: 10,
      }).then(function(tracks) {
        var none=true;
        for(var i=0;i<tracks.length;i++){
          $('#search-container').append('<div class="search-result-container"><div class="search-dummy-container" id="dummy-content' + i + '"></div><div id="button-container' + i + '"></div></div>');
        }
        for(var i=0;i<tracks.length;i++){
          //$("<p><a href="+tracks[i].permalink_url+">"+tracks[i].title+"</a></p>").appendTo('#search-container');
          //$("<img src="+tracks[i].artwork_url+" alt="+tracks[i].id+">").appendTo('#search-container');
          if(tracks[i].embeddable_by=='all'){
            console.log("#dummy-content"+i);
            var track_url = tracks[i].permalink_url;
            SC.oEmbed(track_url,{element: document.getElementById("dummy-content"+i),auto_play:false,maxheight:100});
            $("#button-container"+i).append('<button class="queue-button" id="queue_track" type="submit" style="float:right;" onclick="sendToQueue(\'SoundCloud\',\'' +  tracks[i].title.replace(/'/g,"\\'") + '\',\'' + track_url.replace(/'/g,"\\'") +'\')">Send to Queue</button>');
            // $(oEmbed.html).appendTo('#search-container');
            // console.log(tracks[i].permalink_url);
            // console.log($('#search-site option:selected').html());
            none=false;
            }
        }
        if(none){
          $('#search-container').append('No results found!');
        }
        });
      break;
    case 'Spotify':
      //Search Spotify
      break;
  }
}
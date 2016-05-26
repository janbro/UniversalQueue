var socket = io();
var roomID = getUrlParameter('roomCode');
var username = getUrlParameter('user');
var users = [];
var userSkips = [];
var mediaSites = [];
var mediaLinks = [];
var mediaTitles = [];
var vidPlayState = true;
var startTime = null;
var initialPlayerState = 2;
//Watch for changes

if (screen.width <= 480) {
    alert("This page is designed for desktop or tablet devices!");
}

socket.emit('joinRoomHostView', username, roomID);
$("#roomCode").append(roomID);
$("#userName").append(username);

socket.on('nextMedia', function() {
    $('#skip-button').removeClass('skip-button-grey').addClass('skip-button');
});

socket.on('updateSkipCount', function(skips, skipTarget) {
    $('#skips').empty();
    $('#skips').append("SKIPS: " + skips + "/" + skipTarget);
});

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

socket.on('roomClosed', function() {
    location.href = '/error?reason=The room has closed';
});

socket.on('nextMedia', function() {
    nextMedia();
});

socket.on('updateActiveUsers', function(usersTemp) {
    users = usersTemp;
    updateActiveUsers();
});

socket.on('updateMediaLists', function(mediaSitesTemp, mediaLinksTemp, mediaTitlesTemp) {
    var updateMedia = mediaSites.length;
    mediaSites = mediaSitesTemp;
    mediaLinks = mediaLinksTemp;
    mediaTitles = mediaTitlesTemp;
    if (updateMedia === 0) {
        updateMediaView();
    }
});

socket.on('addUser', function(user) {
    users.push(user);
    //console.log(users);
    socket.emit('updateMediaLists', mediaSites, mediaLinks, mediaTitles);
    updateActiveUsers();
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
    vidPlayState = false;
});

socket.on('playMedia', function() {
    player.playVideo();
    vidPlayState = true;
});

socket.on('joinInfo', function(seconds, playerState) {
    startTime = seconds;
    initialPlayerState = playerState;
});

socket.on('seekTo', function(seconds) {
    if(mediaSites[0]==="YouTube" && player.getPlayerState() !== 2) {
        if(Math.abs(player.getCurrentTime()-seconds)>1){
            player.seekTo(seconds, true);
        }
    }
    else if(mediaSites[0]==="SoundCloud") {
        
    }
});

function nextMedia() {
    userSkips = [];
    mediaSites.shift();
    mediaLinks.shift();
    mediaTitles.shift();
    clearSkips();
    updateMediaView();
}

var player;

$('#skip-button').click(function() {
    socket.emit('skipMedia', socket.id);
    $('#skip-button').removeClass('skip-button').addClass('skip-button-grey');
    return false;
});

function setPlayerState() {
    if (!startTime) {
        setTimeout(setPlayerState, 100);
    }
    else {
        player.seekTo(startTime, true);
        if (initialPlayerState === 1) {
            player.playVideo();
            vidPlayState = true;
        }
        else if (initialPlayerState === 2 || initialPlayerState === 3) {
            player.pauseVideo();
            vidPlayState = false;
        }
    }
}

function onPlayerReady(event) {
    event.target.setVolume(100);
    event.target.playVideo();
    event.target.setPlaybackQuality('default');
    setPlayerState();
}

function onPlayerStateChange(event) {
    if (event.data === 0) {
        nextMedia();
    }
    else if (event.data === 1) {
        if (!vidPlayState) {
            player.pauseVideo();
        }
    }
    else if (event.data === 2) {
        // if (vidPlayState) {
        //     player.playVideo();
        // }
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
    $('#skips').append("SKIPS: " + userSkips.length + "/" + Math.ceil((2 / 3) * users.length));
    socket.emit('updateSkipCount', userSkips.length, Math.ceil((2 / 3) * users.length));
}

function clearSkips() {
    userSkips = [];
    updateSkips();
}

function sendToQueue(site, mediaTitle, mediaLink) {
    socket.emit('addMedia', site, mediaLink, mediaTitle);
    $('#search-container').empty();
    $('#query').val('');
}

function showError(identif) {
    $(identif).addClass('highlight');
    setTimeout(function() {
        $(identif).addClass('fade').removeClass('highlight');
        setTimeout(function() {
            $(identif).removeClass('fade');
        }, 1000);
    }, 2000);
}

function updateMediaView() {
    $("#player").attr('class', '');
    $("#player-container").empty();
    $("#player-container").append("<div id='player'></div>");
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
                    'controls': 0,
                    'iv_load_policy': 3,
                    'disablekb': 0
                }
            });
            // document.getElementById('player').setAttribute("class","video-container");
            // $('#player').append('<iframe id="player" style="display: block;margin-left: auto;margin-right: auto;" type="text/html" width="854" height="480" src="http://www.youtube.com/embed/<?php if(file("songs-queued.txt")!=NULL){echo trim(preg_replace('/\s+/', ' ', $songInfo[1]));}?>?enablejsapi=1" frameborder="0"></iframe>');
            break;
        default:
            document.getElementById('player-container').innerHTML = "<div class='dummy-player-content' id='player'> <div class='spacer' style='clear: both;height:35%' ></div><h2>ADD MEDIA TO THE QUEUE!<br>ROOM CODE: " + roomID + "</h2></div>";
            break;
    }
};
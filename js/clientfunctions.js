var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

function showError(identif) {
    $(identif).addClass('highlight');
    setTimeout(function() {
        $(identif).addClass('fade').removeClass('highlight');
        setTimeout(function() {
            $(identif).removeClass('fade');
        },1000);
    },2000);
}

// After the API loads, call a function to enable the search box.
function handleAPILoaded() {
  $('#search-button').attr('disabled', false);
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
            $('<button class="queue-button" id="queue_track" type="submit" style="float:right;" onclick="sendToQueue(\'YouTube\',\'' +  response.result.items[i].snippet.title.replace(/'/g,"\\'").replace(/"/g,"\\'") + '\',\'' + response.result.items[i].id.videoId.replace(/'/g,"\\'") +'\')">Send to Queue</button>').appendTo('#search-container');
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
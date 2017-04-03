//==========
// LIBRARIES
//==========

var inquirer = require('inquirer');
var Twitter = require('twitter');
var spotify = require('spotify');
var color = require('cli-color');

//============
// USER INPUT 
//============

// liri.js can take in one of the following commands: 
// my-tweets
// spotify-this-song
// movie-this
// do-what-it-says
var userCommand;

inquirer.prompt({
  type: 'list',
  choices: ['my-tweets','spotify-this-song', 'movie-this','do-what-it-says'],
  message: 'What can I do for you?',
  name: 'command'
}).then(function(userData){
  userCommand = userData.command;

  switch(userCommand) {
    case 'my-tweets':
      twitterActions.fetchTweets();
      break;
    case 'spotify-this-song':
      spotifyActions.getUserSongName();
  }
});

//==========
// API WORK
//==========

var twitterActions = {
  //grab the data from js keys and save it as an object 
  'keys': require('./keys.js').twitterKeys,

  fetchTweets: function() {
    // pass the keys object 
    var client = new Twitter(this.keys);

    //request last 20 tweets of authenticated user 
    client.get('statuses/user_timeline', function(error, tweets, response){
      if(error) {
        console.log(error);
        return;
      } else {
        // tweets--> array of tweets 
        // show tweet text and creation time 
        twitterActions.displayTweets(tweets);
      }
    });
  }, 

  displayTweets: function(tweetsArray) {
    var userName = tweetsArray[0].user.name;
    console.log(color.cyan('\n================   Hi '+userName+'! Here are your last 20weets!  ================\n\n'));
    for(var i = 0; i < tweetsArray.length; i++){
      var timestamp = tweetsArray[i].created_at;
      var tweetText = tweetsArray[i].text;
      console.log(color.bgCyan(timestamp));
      console.log(color.cyan(tweetText+'\n'));
    }
  }
};

var spotifyActions = {
  //default: the sign, by ace of bass
  'songName': 'The Sign',

  getUserSongName: function() {
    inquirer.prompt({
      type: 'input',
      message: 'Please enter the name of a song:',
      name: 'songName'
    }).then(function(userData){
      if(userData.songName !== '') {
        spotifyActions.songName = userData.songName;
      }
        spotifyActions.fetchTrackMatches();
    });
  },

  fetchTrackMatches: function() {
    var endpointURL = 'https://api.spotify.com/v1/search?';
    var queryURL = endpointURL + 'q=' +spotifyActions.songName + '&type=track&limit=5'
    spotify.get(queryURL, function(error, data) {
      if(error){
        console.log(error);
      } else {
        var resultsArr = data.tracks.items;
        spotifyActions.whichArtist(resultsArr);
      }
    });
  }, 

  whichArtist: function(resultsArr) {
    var artistChoices = [];
    for(var i = 0; i<resultsArr.length; i++) {
      var song = resultsArr[i];
      var songArtists = '';
      songArtists = song.artists[0].name;
      if (songArtists.length > 1) {
        for(var j=1; j<song.artists.length; j++){
            songArtists += ' & ' + song.artists[j].name;
        }
      }
      //create array of the top 5 artist options
      artistChoices.push(songArtists);
    } 

    // ask the user which artist they want the info for
    inquirer.prompt({
      type: "list",
      choices: artistChoices,
      message: 'Please confirm which artist you\'re looking for:',
      name: 'artist'
    }).then(function(userData){
      // get index of that artist in the choices presented
      var index = artistChoices.indexOf(userData.artist);
      // index corresponds to their index in the items array 
      spotifyActions.displayTrackInfo(resultsArr[index]);
      // 
    });
  }, 

  displayTrackInfo: function(trackItem) {
    console.log(color.magentaBright('\n================   Here is the track info you wanted!  ================\n\n'));

    //song name
    console.log(color.bgMagenta("Track Name"));
    console.log(color.magenta(trackItem.name +'\n'));

    //artists 
    var songArtists = '';
      songArtists = trackItem.artists[0].name;
      if (songArtists.length > 1) {
        for(var j=1; j<trackItem.artists.length; j++){
            songArtists += ' & ' + trackItem.artists[j].name;
        }
      }
    console.log(color.bgMagenta("Track Artist(s)"));
    console.log(color.magenta(songArtists + '\n'));

    // album
    var album = trackItem.album.name;
    console.log(color.bgMagenta("Album Name"));
    console.log(color.magenta(album) + '\n');

    // preview url 
    var previewURL = trackItem.preview_url;
    console.log(color.bgMagenta("Preview Url"));
    console.log(color.magenta(previewURL) + '\n');
  }



};



//SPOTIFY todos: 
// handle spaces in song name 
// add 'other' option where user can type in an alternate artist which will be added to the query
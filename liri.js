//==========
// LIBRARIES
//==========

var inquirer = require('inquirer');
var Twitter = require('twitter');
var spotify = require('spotify');
var request = require('request');
var fs = require('fs');
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

function getCommandFromUser() {
  inquirer.prompt({
    type: 'list',
    choices: ['my-tweets','spotify-this-song', 'movie-this','do-what-it-says'],
    message: 'What can I do for you?',
    name: 'command'
  }).then(function(userData){
    userCommand = userData.command;
    fireActionFromCommand(userCommand);
  });
}

function checkIfAnotherCommand() {
  inquirer.prompt({
    type: 'confirm',
    message: 'Would you like to ask me anything else?',
    name: 'hasAnotherQuestion'
  }).then(function(userData){
    if(userData.hasAnotherQuestion === true) {
      getCommandFromUser();
    } else {
      console.log(color.bgGreen('\n\nGoodbye!\n'));
    }
  })
}

function fireActionFromCommand(command, userInput = null) {
  switch(command) {
      case 'my-tweets':
        twitterActions.fetchTweets();
        break;
      case 'spotify-this-song':
        if(userInput === null) {
          spotifyActions.getUserSongName();
        } else { // if reading command from random.txt
          spotifyActions.songName = userInput;
          spotifyActions.fetchTrackMatches();
        }
        break;
      case 'movie-this':
        if(userInput === null) {
          movieActions.getUserMovieName();
        } else {
          movieActions.movieName = userInput;
          movieActions.movieDataRequest();
        }
        break;
      case 'do-what-it-says': 
        otherActions.readCommandFromFile();
        break;
    }
}

//=================
// API/Library work
//=================

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
    var tweetHeader = '\n =================  Hi '+userName+'! Here are your last 20weets!  ================\n';

    // write header to console
    console.log(color.bgCyan(tweetHeader));

    // write tweets to console and logfile 
    for(var i = 0; i < tweetsArray.length; i++){
      var timestamp = tweetsArray[i].created_at;
      var tweetText = tweetsArray[i].text;
      console.log(color.bgCyan(timestamp));
      console.log(color.cyan(tweetText+'\n'));
      fs.appendFile('liri_history.txt', '\nYou searched for recent tweets. Here\'s one: ' + timestamp + ': ' + tweetText + '\n\n', function(error) {
          if(error) {
            console.log(error);
          }
      });
    }

    // if not 20, display message to user
    if (tweetsArray.length < 20) {
      console.log(color.red('Looks like you don\'t have 20 tweets yet! Better get to work!\n\n'));
    }

    // get new command from user? 
    checkIfAnotherCommand();
  }
};

var spotifyActions = {
  //default: the sign, by ace of bass
  'songName': 'The Sign',
  'offset': 0,

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
    var queryURL = endpointURL+'q='+spotifyActions.songName+'&type=track&offset='+this.offset+'&limit=5'
    spotify.get(queryURL, function(error, data) {
      if(error){
        console.log(error);
      } 
      else {
        var resultsArr = data.tracks.items;
        // if no results 
        if (resultsArr.length === 0) {
          console.log('Sorry, Spotify doesn\'t have any results for ' + color.redBright(spotifyActions.songName) + '!\n');
          return;
        }
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
    artistChoices.push('Show More Artists');

    // ask the user which artist they want the info for
    inquirer.prompt({
      type: 'list',
      choices: artistChoices,
      message: 'Please confirm which artist you\'re looking for:',
      name: 'artist'
    }).then(function(userData){
      if(userData.artist === 'Show More Artists') {
        if(spotifyActions.offset < 25) {
          spotifyActions.offset += 5;
        } else {
          // cycle back through those first 20 again. 
          spotifyActions.offset = 0;
          console.log(color.red('Back to beginning of results'));
        }
        spotifyActions.fetchTrackMatches();
      } else {
        // get index of that artist in the choices presented
        var index = artistChoices.indexOf(userData.artist);
        // index corresponds to their index in the items array 
        spotifyActions.displayTrackInfo(resultsArr[index]);
      }
    });
  }, 

  displayTrackInfo: function(trackItem) {
    // write header to console and logfile
    var trackHeader = '\n ==============  Here is the track info you wanted!  ============== \n'
    console.log(color.bgMagentaBright(trackHeader));

    //write song info to console
    //song name
    console.log(color.bgMagenta('Track Name'));
    console.log(color.magenta(trackItem.name +'\n'));

    //artists 
    var songArtists = '';
      songArtists = trackItem.artists[0].name;
      if (songArtists.length > 1) {
        for(var j=1; j<trackItem.artists.length; j++){
            songArtists += ' & ' + trackItem.artists[j].name;
        }
      }
    console.log(color.bgMagenta('Track Artist(s)'));
    console.log(color.magenta(songArtists + '\n'));

    // album
    var album = trackItem.album.name;
    console.log(color.bgMagenta('Album Name'));
    console.log(color.magenta(album) + '\n');

    // preview url 
    var previewURL = trackItem.preview_url;
    console.log(color.bgMagenta('Preview Url'));
    console.log(color.magenta(previewURL) + '\n');

    // write song info to logfile
    fs.appendFile('liri_history.txt', 
      `\nYou searched for: ${trackItem.name}, from the album ${trackItem.album.name}\n. View it here: ${trackItem.preview_url}
      `, function(error){
        if(error){console.log(error);}
      })
    // get new command from user?
    checkIfAnotherCommand();
  }
};

var movieActions = {
  //default: Mr. Nobody
  'movieName': 'Mr. Nobody',

  getUserMovieName: function() {
    inquirer.prompt({
      type:'input',
      message:'What title should I look up?',
      name: 'movieTitle'
    }).then(function(userData){
      if(userData.movieTitle !== '') {
        movieActions.movieName = userData.movieTitle;
      }
      movieActions.movieDataRequest();
    })
  },

  movieDataRequest: function() {
    var queryURL = 'http://www.omdbapi.com/?t=' + this.movieName
    request(queryURL, function(error, response, body) {
      if(JSON.parse(body).Response === 'False') {
        console.log(color.red('Sorry, OMDB doesn\'t have that title on record!'));
        return;
      } else {
        movieActions.displayMovieInfo(JSON.parse(body));
      }
    })
  }, 

  displayMovieInfo: function(movieObject) {
    console.log(movieObject.Ratings);
    var title = movieObject.Title;
    var year = movieObject.Year;
    var imdbRat = movieObject.imdbRating;
    var country = movieObject.Country;
    var language = movieObject.Language;
    var tomatoesRat = movieObject.Ratings[1].Value;
    var plot = movieObject.Plot;
    var actors = movieObject.Actors;
    // var tomatoesURL = movieObject.
    console.log(color.yellow('\n================   Here\'s the info I have on ' + this.movieName + '!   ================\n\n'));

    console.log(color.bgYellow(title));
    console.log('Release Year: ' + year);
    console.log('IMDB Rating: ' + imdbRat);
    console.log('Rotten Tomatoes Rating: ' + tomatoesRat);
    console.log('Country: ' + country);
    console.log('Language(s): ' + language);
    console.log('Actors: ' + actors);
    console.log(color.bgYellow('---------- Plot Summary ----------'));
    console.log(color.yellow(plot) + '\n\n');

    // append to logfile
    fs.appendFile('liri_history.txt',`\n\nYou searched for ${title}(${year}). It got ${imdbRat} on imdb and here's the plot summary: ${plot}`, function(error){
      if(error){console.log(error);}
    })

    // get new command from user?
    checkIfAnotherCommand();
  }
};

var otherActions = {

  readCommandFromFile: function() {
    fs.readFile('random.txt', 'utf8', function(error, fileData){
      if(error) {
        console.log(error);
        return;
      } else {
        var dataArr = fileData.split(',');
        var command = dataArr[0].trim();
        var userInput = dataArr[1].trim();
        fireActionFromCommand(command, userInput);
      }
    })
  }
};

//============
// INITIALIZE
//============
getCommandFromUser();


//SPOTIFY todos: 
// add 'other' option where user can type in an alternate artist which will be added to the query

//general todos: 
// movie section
// do what it says sectino 
// once done with a query, recall the initial prompt functions so user can do something else 
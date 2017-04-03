//==========
// LIBRARIES
//==========

var inquirer = require('inquirer');
var Twitter = require('twitter');
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
      spotifyActions.fetchSongInfo();
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
    client.get('statuses/user_timeline', {count: 2}, function(error, tweets, response){
      if(error) {
        console.log(error);
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
  fetchSongInfo: function() {
    
  }

};



/**
 * Module dependencies.
 */

var Analytics = require('analytics-node');
var thunkify = require('thunkify-wrap');
var storage = require('./lib/storage');
var urlRegex = require('url-regex');
var Botkit = require('Botkit');
var fmt = require('node-fmt');
var url = require('url');
var _ = require('lodash');
var co = require('co');

/**
 * Assign environmental variables.
 */

var clientId = process.env.clientId;
var clientSecret = process.env.clientSecret;
var port = process.env.PORT || 3000;
if (!clientId || !clientSecret || !port) {
  console.log('Error: clientId, clientSecret, and port are undefined in environment');
  process.exit(1);
}

/**
 * Setup `analytics`.
 */

var analytics = new Analytics(process.env.segmentKey);

/**
 * Configure the controller.
 */

var controller = Botkit.slackbot({
  storage: thunkatron(storage())
}).configureSlackApp({
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: 'http://slack-channel-fomo-bot.herokuapp.com/oauth',
  scopes: ['bot']
});

/**
 * Setup web server.
 */

controller.setupWebserver(port, function(err, webserver) {
  controller.createWebhookEndpoints(controller.webserver);
  controller.createOauthEndpoints(controller.webserver, function(err, req, res) {
    if (err) return res.status(500).send('ERROR: ' + err);
    res.send('Success!');
  });
});

/**
 * Setup bots.
 */

var _bots = {};
function trackBot(bot) {
  _bots[bot.config.token] = bot;
}

/**
 * Create bots.
 */

controller.on('create_bot', function(bot, config) {
  // Thunkify the api.
  bot.api = thunkatron(bot.api);

  // If already configured, leave.
  if (_bots[bot.config.token]) return;

  // Otherwise, start RTM.
  bot.startRTM(co.wrap(function *(err) {
    if (err) return err;
    trackBot(bot);

    /**
     * Add team to database.
     */

    var team = {
      id: bot.team_info.id,
      domain: bot.team_info.domain,
      email_domain: bot.team_info.email_domain,
      feed_id: ''
    };
    yield controller.storage.teams.save(team);

    /**
     * Analytics.
     */

    analytics.identify({
      userId: config.createdBy,
      traits: {
        team_id: bot.config[0].id,
        domain: bot.config[0].domain,
        email_domain: bot.config[0].email_domain
      }
    });

    analytics.track({
      userId: config.createdBy,
      event: 'Bot Installed'
    });

    /**
     * Initial conversation with bot's creator.
     */

    bot.startPrivateConversation({ user: config.createdBy }, co.wrap(function *(err, convo) {
      if (err) return console.log(err);
      convo.say('Hello, I\'m Channel FOMO Bot! I just joined your team. I\'m here to let you know when a new channel is created!');
      convo.say('Whenever someone creates a new channel, I\'ll publish it to a channel of your choosing.');
      convo.ask('What channel should I publish to? Respond with the channel name or skip by saying \'no\' (you can set this later by mentioning me and saying \'publish to <channel-name>\').', co.wrap(function *(response, convo) {
        if (response.text.toLowerCase() === 'no') {
          convo.say('No problem! See you around :)');
          convo.next();
        }
        var res = yield bot.api.channels.list({});
        var channel = _.filter(res.channels, function(c) {
          return c.name.indexOf(response.text) >= 0;
        });
        if (channel.length > 0) {
          team.feed_id = channel[0].id;
          yield controller.storage.teams.save(team);
          convo.say('Great! New channels will be posted there.');
          convo.next();
        } else {
          convo.say('Hmmm, that doesn\'t look like a valid channel name.');
          convo.repeat();
          convo.next();
        }
      }));
    }));
  }));
});

/**
 * Open connection.
 */

controller.on('channel_created', co.wrap(function *(bot, res) {
  var team = yield controller.storage.teams.get(bot.team_info.id);
  if (!team[0].feed_id) return;
  var text = fmt('<#%s> was just created by <@%s>', res.channel.id, res.channel.creator);

  bot.say({
    text: text,
    channel: team[0].feed_id
  });

  analytics.identify({
    userId: res.channel.creator
    traits: {
      team_id: team[0].id
    }
  });

  analytics.track({
    userId: res.channel.creator,
    event: 'Bot Installed'
  });
}));

/**
 * Open connection.
 */

controller.on('rtm_open', function(bot) {
  console.log('** The RTM api just connected!');
});

/**
 * Close connection.
 */

controller.on('rtm_close', function(bot) {
  console.log('** The RTM api just closed');
  // you may want to attempt to re-open
});

/**
 * Connect all bots.
 */

controller.storage.teams.all(function(err, teams) {
  if (err) throw new Error(err);
  for (var t in teams) {
    if (teams[t].bot) {
      var bot = controller.spawn(teams[t]).startRTM(function(err) {
        if (err) return console.log('Error connecting bot to Slack: ', err);
        trackBot(bot);
      });
    }
  }
});

/**
 * Hear URL(s) in chat.
 */

controller.hears('publish', ['direct_message', 'direct_mention', 'mention', 'ambient'], function(bot, message) {
  // publish to <channel-name>
});

/**
 * Help.
 */

controller.hears('help', ['direct_message', 'direct_mention', 'mention', 'ambient'], function(bot, message) {
  var text = '';
  bot.reply(message, text);
});

/**
 * Private function to deep nest thunkify.
 */

function thunkatron(obj) {
  Object.keys(obj).forEach(function(key) {
    if (typeof obj[key] === 'function') obj[key] = thunkify(obj[key]);
    if (typeof obj[key] === 'object' && obj[key] !== null) obj[key] = thunkatron(obj[key]);
  });
  return obj;
}

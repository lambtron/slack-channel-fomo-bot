
/**
 * Module dependencies.
 */

var thunkify = require('./lib/util').thunkify;
var storage = require('./lib/storage');
var urlRegex = require('url-regex');
var Botkit = require('botkit');
var bot = require('./lib/bot');
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
 * Configure the controller.
 */

var controller = Botkit.slackbot({
  storage: thunkify(storage())
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
  // Landing page.
  webserver.get('/', function(req, res) {
    res.sendFile('./client/index.html', { root: __dirname });
  });

  controller.createWebhookEndpoints(controller.webserver);
  controller.createOauthEndpoints(controller.webserver, function(err, req, res) {
    if (err) return res.status(500).send('ERROR: ' + err);
    res.sendFile('./client/success.html', { root: __dirname });
  });
});

/**
 * Create bots.
 */

controller.on('create_bot', bot.createBot);

/**
 * Open connection.
 */

controller.on('rtm_open', bot.rtmOpen);

/**
 * Close connection.
 */

controller.on('rtm_close', bot.rtmClose);

/**
 * Connect all bots.
 */

controller.storage.teams.all(bot.connectAll);

/**
 * The `publish` command.
 */

controller.hears('publish', ['direct_message', 'direct_mention', 'mention', 'ambient'], co.wrap(bot.publish));

/**
 * The `help` command.
 */

controller.hears('help', ['direct_message', 'direct_mention', 'mention', 'ambient'], bot.help);

/**
 * When new channel is created.
 */

controller.on('channel_created', co.wrap(bot.channelCreated));

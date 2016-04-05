
/**
 * Module dependencies.
 */

var thunkify = require('./util').thunkify;
var fmt = require('node-fmt');
var _ = require('lodash');
var co = require('co');

/**
 * Setup bots.
 */

var _bots = {};

/**
 * create_bot
 */

exports.createBot = function(bot, config) {
  // Thunkify the api.
  bot.api = thunkify(bot.api);

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
          return response.text.indexOf(c.name) >= 0;
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
};

/**
 * Open connection.
 */

exports.channelCreated = function *(bot, res) {
  var team = yield controller.storage.team.get(bot.team_info.id);
  if (!team[0].feed_id) return;
  var text = fmt('<#%s> was just created by <@%s>', res.channel.id, res.channel.creator);

  bot.say({
    text: text,
    channel: team[0].feed_id
  });
};

/**
 * Open connection.
 */

exports.rtmOpen = function(bot) {
  console.log('** The RTM api just connected!');
};

/**
 * Close connection.
 */

exports.rtmClose = function(bot) {
  console.log('** The RTM api just closed');
  // you may want to attempt to re-open
};

/**
 * When someone writes `publish` in command.
 */

exports.publish = function *(bot, message) {
  var team = yield controller.storage.team.get(bot.team_info.id);
  var res = yield bot.api.channels.list({});
  var channel = _.filter(res.channels, function(c) {
    return message.text.indexOf(c.name) >= 0;
  });
  if (channel.length > 0) {
    team.feed_id = channel[0].id;
    yield controller.storage.teams.save(team);
    return bot.reply(fmt('Great! New channels will be posted in <#$s>.', channel[0].id));
  }
  bot.reply('Uh oh! That channel doesn\'t exist. Try again!');
}

/**
 * Help.
 */

exports.help = function(bot, message) {
  var text = fmt('Hi, <@%s>! The only command I have is:\n', message.user);
  text += '  `publish <channel-name>`\n';
  text += 'This will change which channel I\'ll publish to.';
  bot.reply(message, text);
};

/**
 * Connect all bots.
 */

exports.connectAll = function(err, teams) {
  if (err) throw err;
  for (var t in teams) {
    if (teams[t].bot) {
      var bot = controller.spawn(teams[t]).startRTM(function(err) {
        if (err) return console.log('Error connecting bot to Slack: ', err);
        trackBot(bot);
      });
    }
  }
};

/**
 * Helper function to initialize a bot.
 */

function trackBot(bot) {
  _bots[bot.config.token] = bot;
}

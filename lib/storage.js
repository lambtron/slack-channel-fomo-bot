
/**
 * Module dependencies.
 */

var mongo = process.env.MONGOLAB_URI || 'mongodb://localhost/bot-charlie';
var db = require('monk')(mongo);

/**
 * Return function.
 */

module.exports = function(config) {
  var teams_db = db.get('teams');
  var users_db = db.get('users');
  var channels_db = db.get('channels');

  /**
   * Create storage getters and setters.
   */

  var storage = {
    teams: {
      get: function(team_id, cb) {
        teams_db.findOne({ id: team_id }, cb);
      },
      save: function(team, cb) {
        teams_db.findAndModify({ id: team.id }, team, { upsert: true, new: true }, cb);
      },
      all: function(cb) {
        teams_db.find({}, cb);
      }
    },
    users: {
      get: function(user_id, cb) {
        users_db.findOne({ id: user_id }, cb);
      },
      save: function(user, cb) {
        users_db.findAndModify({ id: user.id }, user, { upsert: true, new: true }, cb);
      },
      all: function(cb) {
        users_db.find({}, cb);
      }
    },
    channels: {
      get: function(channel_id, cb) {
        channels_db.findOne({ id: channel_id }, cb);
      },
      save: function(channel, cb) {
        channels_db.findAndModify({ id: channel.id }, channel, { upsert: true, new: true }, cb);
      },
      all: function(cb) {
        channels_db.find({}, cb);
      }
    }
  };

  return storage;
};

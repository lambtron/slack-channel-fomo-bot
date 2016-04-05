
/**
 * Module dependencies.
 */

var thunk = require('thunkify-wrap');

/**
 * Private function to deep nest thunkify.
 */

exports.thunkify = function thunkify(obj) {
  Object.keys(obj).forEach(function(key) {
    if (typeof obj[key] === 'function') obj[key] = thunk(obj[key]);
    if (typeof obj[key] === 'object' && obj[key] !== null) obj[key] = thunkify(obj[key]);
  });
  return obj;
}

exports = module.exports = function format() {
  var initial = arguments[0],
      len = arguments.length;
  for (var j = 1; j < len; j++) initial = initial.replace('%s', arguments[j]);
  return initial;
}
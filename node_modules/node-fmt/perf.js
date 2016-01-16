var Benchmark = require('benchmark');
var fmt = require('./');

function format() {
  var args = [].slice.call(arguments);
  var initial = args.shift();

  function replacer (text, replacement) {
    return text.replace('%s', replacement);
  }
  
  return args.reduce(replacer, initial);
}

Benchmark
  .Suite()
  .add('original', function() {
    return format(new Date() + ' %s', 'world');
  })
  .add('optimized', function() {
    return fmt(new Date() + ' %s', 'world');
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log(fmt('Fastest is %s', this.filter('fastest').pluck('name')));
  })
  .run({ 
    async: true
  });
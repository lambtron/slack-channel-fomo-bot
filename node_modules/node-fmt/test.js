var assert = require('assert');

describe('node-fmt', function() {
  
  before(function() {
    this.fmt = require('./');
  });
  
  it('should replace %s with args', function() {
    assert.equal(this.fmt('Hello %s', 'world'), 'Hello world');
  });
  
  it('should replace multiple vals', function() {
    assert.equal(this.fmt('Hello %s%s', 'world', '!'), 'Hello world!');
  });
  
  it('should ignore missing vals', function() {
    assert.equal(this.fmt('Hello %s%s', 'world'), 'Hello world%s');
  });
});
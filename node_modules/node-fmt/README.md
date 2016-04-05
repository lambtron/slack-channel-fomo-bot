# node-fmt

Lean string formatting (optimisation of https://github.com/bevacqua/js#strings)

### Installation
    
    $ npm install node-fmt

### Usage

```js

var fmt = require('node-fmt');

console.log(fmt('Hello %s', 'world')); // 'Hello world'
```

### Development

    $ git clone git@github.com:rusintez/node-fmt.git
    $ cd node-fmt
    $ npm install
    $ npm test
    $ npm run perf

### TODO

- support `%j` and emulate `util.inspect`

### Author

Vladimir Popov <rusintez@gmail.com>

### License

MIT
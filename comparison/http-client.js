var request = require('request');

var t = 0;

for (var r = 0; r<10000; r++) {
    request.get('http://50.116.22.34:3000/hello_world', function (req, res, body) {
        t++;
        console.log(t);
    });
}

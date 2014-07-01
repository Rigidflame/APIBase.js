var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

apibase.retrieve().then(function (API) {
    var t = 0;

    for (var r = 0; r<10000; r++) {
        API.hello_world().then(function (result) {
            t++;
            console.log(t);
            if (t == 10000) process.exit();
        });
    }
});

var hello_world = apibase.get('hello_world');

hello_world().then(function (result) {
    console.log(result);
});

var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

apibase.context({
    name: "Abe"
});

apibase.retrieve().then(function (API) {
    console.log('here');
    var t = 0;

    for (var r = 0; r<10000; r++) {
        API.hello().then(function (result) {
            t++;
            console.log(t);
            if (t == 10000) process.exit();
        });
    }
});

var hello = apibase.get('hello');

hello().then(function (result) {
    console.log(result);
});

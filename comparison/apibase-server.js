var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");
var secrets = require('../examples/secrets');

apibase.auth(secrets.token);

apibase.hello = function () {
    return "Hello world";
};

apibase.publish();
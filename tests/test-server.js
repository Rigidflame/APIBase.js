var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

apibase.search = function (search) {   
    return 'I LIKE SEARCHING FOR ' + search;
};

apibase.fail = function (search) {   
    throw search;
    // We wont get to this return.
    return "This shouldnt happen.";
};

apibase.rest = function (time, deferred) {
    setTimeout(function () {
        deferred.resolve("Coming from a promise!");
        // deferred.cancel to pass an error
    }, time);
};


apibase.publish();

var apibase = require('./apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

apibase.getLikes = function (accesstoken, displayName) {   
    return 'I LIKE CAKE';
};

apibase.search = function (search) {   
    return 'I LIKE SEARCHING FOR ' + search;
};

apibase.publish();
var apibase = require('../apibase')("https://brilliant-fire-67.firebaseio.com/apibase");

apibase.auth('HsiO9VNUQBW25QiFRKaDMfDhFhgaLUB1R56RMbzJ');

apibase.greeting = function () {
    return "Hello " + this.ctx.name;
};

apibase.search = function (search) {   
    return 'I LIKE SEARCHING FOR ' + search;
};

apibase.fail = function (search) {   
    throw search;
    // We wont get to this return.
    return "This shouldnt happen.";
};

apibase.rest = function (time, done) {
    setTimeout(function () {
        done("Coming from a promise!");
    }, time);
};

apibase.restFail = function (time, done) {
    setTimeout(function () {
        throw "Error coming from an async promise!";
    }, time);
};


apibase.publish();

apibase.context({
    name: "Pete"
});

apibase.get('greeting')().then(function (result) {
    console.log(result);
});

apibase.get('search')('cats').then(function (result) {
    console.log(result);
});
require('express');
require('express/plugins');

get('/', function() {
    this.contentType('html');
    return '<h1>Hi!</h1>';
});

run();

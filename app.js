var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// get our config file
var config = require('./config');
// routes
var routes = require('./app_server/routes/index');
var users = require('./app_server/routes/users');
var deviceserver_routes = require('./api_v1/routes/deviceserver_routes');
var deviceserver_controller = require('./api_v1/controllers/deviceserver_controller');
// reates an Express application
var app = express();

// secret
app.set('superSecret', config.secret);

// view engine setup
app.set('views', path.join(__dirname, 'app_server', 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
// URL subset
app.use('/api/v1', deviceserver_routes);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;


deviceserver_controller.subscribeToClientConnect(config.HOST + "/api/v1/notifications/clientConnected")
    .then((response) => {
        switch (response.statusCode) {
            case 409:
                console.log("Failed to subscribe to onClientConnected event. Already subscribed.");
                break;
            case 200:
            case 201:
            case 204:
                console.log("Successfully subscribed to onClientConnected event.");
                break;
            default:
                console.error("Failed to subscribe to onClientConnected event. Server responded with : %d", response.statusCode);
        }
    });

deviceserver_controller.subscribeToClientUpdate(config.HOST + "/api/v1/notifications/clientUpdated")
    .then((response) => {
        switch (response.statusCode) {
            case 409:
                console.log("Failed to subscribe to clientUpdated event. Already subscribed.");
                break;
            case 200:
            case 201:
            case 204:
                console.log("Successfully subscribed to clientUpdated event.");
                break;
            default:
                console.error("Failed to subscribe to clientUpdated event. Server responded with : %d", response.statusCode);
        }
    });

deviceserver_controller.initialize(function () {
    console.log("Initilization finished");
});
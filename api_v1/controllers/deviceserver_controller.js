/**
 * Device server (DS) controller
 * This methods consumes DS REST API and navigate through its resources.
 *
 */


/**
 * Login credentials - API Keys from the developer console
 * In production environment uses heroku config variables
 *
 */

var config = require('./../../config.js');

var LOGIN_ACCESS_KEY,
    LOGIN_ACCESS_SECRET;

if (process.env.NODE_ENV === 'production') {
    if (LOGIN_ACCESS_KEY === undefined || LOGIN_ACCESS_SECRET === undefined){
        LOGIN_ACCESS_KEY = config.LOGIN_ACCESS_KEY;
        LOGIN_ACCESS_SECRET = config.LOGIN_ACCESS_SECRET;  
    } else {
    LOGIN_ACCESS_KEY = process.env.LOGIN_ACCESS_KEY;
    LOGIN_ACCESS_SECRET = process.env.LOGIN_ACCESS_SECRET;
    }
} else {
    LOGIN_ACCESS_KEY = config.LOGIN_ACCESS_KEY;
    LOGIN_ACCESS_SECRET = config.LOGIN_ACCESS_SECRET;
}

var creator = require('creator-js-client')(LOGIN_ACCESS_KEY, LOGIN_ACCESS_SECRET);
var ifttt_helper = require('../helpers/ifttt_helper');

var LastCount = -1;

//------------------------------------------------------------------------------
/**
 * Subscribe to 'clientConnected' event.
 *
 */
exports.subscribeToClientConnect = function (url, callback) {
    const promise = creator.request(
        {
            steps: ['subscriptions'],
            method: 'POST',
            data: {
                'SubscriptionType': 'ClientConnected',
                'Url': url
            }
        });
    return promise.nodeify(callback);
};

/**
 * Subscribe to 'clientUpdated' event.
 *
 */
exports.subscribeToClientUpdate = function (url, callback) {
    const promise = creator.request(
        {
            steps: ['subscriptions'],
            method: 'POST',
            data: {
                'SubscriptionType': 'ClientUpdated',
                'Url': url
            }
        });
    return promise.nodeify(callback);
};

/**
 * Subscribe to observation of specific objectId instance.
 *
 */
function subscribeToObservation(clientName, objectId, instanceId, property, url) {
    const promise = creator.request(
        {
            steps: ['clients', {Name: clientName},
                'objecttypes', {ObjectTypeID: objectId.toString()},
                'instances', {InstanceID: instanceId.toString()},
                'subscriptions'],
            method: 'POST',
            data: {
                'SubscriptionType': 'Observation',
                'Url': url,
                'Property': property
            },
            nocache: true
        });
    return promise;
}

/**
 * Checks whether client has specified property on specified object instance.
 * Promise will return false result even when connection to device server fails or
 * client/object does not exist on device server.
 * @param clientName on which check is performed
 * @param objectID
 * @param instanceID
 * @param property
 * @returns {Promise|Promise.<bool>|*}
 * 
 */
function checkForResourceExistence(clientName, objectID, instanceID, property) {
    const promise = creator.request(
        {
            steps: ['clients', {Name: clientName},
                'objecttypes', {ObjectTypeID: objectID.toString()},
                'instances', {InstanceID: instanceID.toString()}],
            method: 'GET',
            nocache : true
        })
        .then((response) => {
            if (response.statusCode >= 400 || response.body[property] === undefined) {
                return false;
            }
            return true;
        }, () => {
            return false;
        });
    return promise;
}

exports.handleButtonPressed = function (req, res, handler) {
	res.sendStatus(200);
    req.body.Items.forEach(function (item) {
        if (item.SubscriptionType && item.Value && item.Value.DigitalInputCounter !== undefined) {
            console.log("Button count = ", item.Value.DigitalInputCounter );
            if (item.Value.DigitalInputCounter > LastCount) {
                LastCount = item.Value.DigitalInputCounter;
                console.log("Update contains an increased value, firing IFTTT");
                ifttt_helper.notifyButtonPressed();  
            }
            else {
                console.log("Update contained the same button count, not firing IFTTT");
            }
        }
        else {
            console.error("Observation notification contains invalid payload. %s", JSON.stringify(item));
        }
    });
};

/**
 * Synchronize button count, i.e.
 *  - request first instance of digital input object
 *  - then update store the current count value to LastCount
 * 
 */
function syncButtonCount(item) {
    var cl = item;
    console.log("Requesting current button count for client: %s", cl.Name);
    const promise = creator.request(
        {
            steps: ['clients', {Name: item.Name},
                'objecttypes', {ObjectTypeID: '3200'},
                'instances', {InstanceID: '0'}],
            method: 'GET'
        })
        .then((response) => {
            LastCount = response.body.DigitalInputCounter;
            console.log("Updating LastCount with recent count %s: code[%s]", LastCount, response.statusCode);
            return response;
        });
    return promise;
}

/**
 * This method is responsible for initializng app.
 * It requests all clients from DS and:
 *  - insert or update client in db
 *  - tries to subscribe for temp change events
 *  - updates client with most recent data
 * 
 */
exports.initialize = function (handler) {
    console.log("Initializing Device Server controller");
    const promise = creator.request({steps: ['clients']})
        .then((response) => {
            if (response.statusCode >= '400') {
                return Promise.reject(new Error("Requesting clients failed with code: %d", response.statusCode));
            }
            return response.body.Items;
        })
        .then((clients) => {
            return Promise.all(clients.map(cl => {
                return subscribeToObservation(cl.Name, '3200', '0', 'DigitalInputCounter', config.HOST + '/api/v1/notifications/buttonPressed')
                    .then((response) => {
                        console.log(response);
                        return cl;
                    })
                    .then((cl) => {
                        return syncButtonCount(cl)
                            .then((response) => {
                                console.log("Sync button count: %s", response.statusCode);
                            });
                    });
            }));
        })
        .catch((error) => {
            console.error(error);
        });
    return promise.nodeify(handler);
};

exports.onClientConnected = function (req, res, handler) {
    res.sendStatus(204);

    console.log("Client connected: %s", req.body);

    if (req.body.Items.length === 0) {
        return;
    }
    var items = req.body.Items[0];
    var subscription = items.Links.filter(function (element) {
        return element.rel === "client";
    });
    if (subscription.length === 0) {
        console.error("[onClientUpdated] Could not find client url!");
        return;
    }

    return creator.request({steps: ['clients']})
        .then((response) => { //request clients and find one matching subscription id
            var clients = response.body.Items;
            var filteredClients = clients.filter(function (c) {
                var href = subscription[0].href;
                var links = c.Links.filter(function (l) {
                    return l.href.indexOf(href) !== -1;
                });
                return links.length > 0;
            });

            return filteredClients[0];
        })
        .then((c) => {
                return syncButtonCount(c)
                    .then((response) => {
                        console.log("Sync count: %s", response.statusCode);
                    })
                    .catch((error) => {
                        console.error(error);
                    });
        })
};

/**
 * Callback triggered when new client is connected.
 * What it does:
 * - extracts client id from subscription link
 * - request clients to match that id
 * - tryies to insert new client to db
 * - subscribe to temperature change
 * 
 */
exports.onClientUpdated = function (req, res, handler) {
    res.sendStatus(204);

    if (req.body.Items.length === 0) {
        return;
    }
    var items = req.body.Items[0];
    var subscription = items.Links.filter(function (element) {
        return element.rel === "client";
    });
    if (subscription.length === 0) {
        console.error("[onClientUpdated] Could not find client url!");
        return;
    }

    return creator.request({steps: ['clients']})
        .then((response) => { //request clients and find one matching subscription id
            var clients = response.body.Items;
            var filteredClients = clients.filter(function (c) {
                var href = subscription[0].href;
                var links = c.Links.filter(function (l) {
                    return l.href.indexOf(href) !== -1;
                });
                return links.length > 0;
            });

            return filteredClients[0];
        })
        .then((c) => {
            return checkForResourceExistence(c.Name, 3200, 0, 'DigitalInputCounter')
                .then((exist) => {
                    if (exist === true)
                        return c;
                    return Promise.reject("Client [" +c.Name + "] does not have [DigitalInputCounter] property on object 3200/0");
                });
        })
        .then((c) => {
            console.log("Subscribing client %s to button count changes", c.Name);
            return subscribeToObservation(c.Name, '3200', '0', 'DigitalInputCounter', config.HOST + '/api/v1/notifications/buttonPressed')
                .then((response) => {
                    console.log(response);
                    return c;
                })
                .then((c) => {
                    return syncButtonCount(c)
                        .then((response) => {
                            console.log("Sync count: %s", response.statusCode);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                });
        })
        .catch(error => {
            console.error(error);
        });
};
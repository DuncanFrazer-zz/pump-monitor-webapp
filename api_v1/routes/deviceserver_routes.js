/**
 * Device server routes
 * Receive notifications (POST Payload) from the Device Server
 *
 */
var express = require('express');
var router = express.Router();
var ds_controller = require('../controllers/deviceserver_controller');

/**
 * Receives notifications from the device server, when client connected
 *
 */

/**
 * @api {post} /notifications/clientConnected
 * @apiName onClientConnected
 * @apiGroup deviceserver_routes
 * @apiDescription Receives notifications from the device server, when client connected
 * @apiParam {json} notification Client Connected notification
 * 
 */
router.post('/notifications/clientConnected', function (req, res, handler) {
    ds_controller.onClientConnected(req, res, handler);
});

/**
 * @api {post} /notifications/clientUpdated
 * @apiName onClientUpdated
 * @apiGroup deviceserver_routes
 * @apiDescription Receives notifications from the device server, when client updated
 * @apiParam {json} notification Client Updated notification
 * 
 */
router.post('/notifications/clientUpdated', function (req, res, handler) {
    ds_controller.onClientUpdated(req, res, handler);
});

/**
 * @api {post} /notifications/clientUpdated
 * @apiName handleButtonPressed
 * @apiGroup deviceserver_routes
 * @apiDescription Receives notifications from the device server, when temperature changes
 * @apiParam {json} notification Client Temperature Changed notification
 * 
 */
router.post('/notifications/buttonPressed', function (req, res, handler) {
    ds_controller.handleButtonPressed(req, res, handler);
});

module.exports = router;
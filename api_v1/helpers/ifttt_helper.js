/**
 * Methods to manage DB data and support CRUD operations
 *
 */
const request = require('request');
const ifttt = require('../../config').modules.ifttt;

exports.notifyButtonPressed = function () {
    if (!ifttt || !ifttt.enabled) {
        return;
    }
    request.post(
        'https://maker.ifttt.com/trigger/button/with/key/' + ifttt.ifttt_key,
        {},
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            } else {
                console.error("Unable to call IFTTT Maker channel");
            }
        }
    );
};






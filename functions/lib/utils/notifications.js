"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTopicNotification = sendTopicNotification;
const config_js_1 = require("../config.js");
/**
 * Sends a push notification to a specific topic
 * @param topic The topic to subscribe to (e.g. 'signals')
 * @param payload The notification content
 */
async function sendTopicNotification(topic, payload) {
    try {
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data,
            topic: topic,
        };
        const response = await config_js_1.messaging.send(message);
        console.log(`[Notification] Successfully sent message to topic '${topic}':`, response);
        return response;
    }
    catch (error) {
        console.error(`[Notification] Error sending message to topic '${topic}':`, error);
        throw error;
    }
}
//# sourceMappingURL=notifications.js.map
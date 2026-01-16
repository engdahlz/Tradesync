
import { messaging } from '../config.js';

export interface NotificationPayload {
    title: string;
    body: string;
    data?: { [key: string]: string };
}

/**
 * Sends a push notification to a specific topic
 * @param topic The topic to subscribe to (e.g. 'signals')
 * @param payload The notification content
 */
export async function sendTopicNotification(topic: string, payload: NotificationPayload) {
    try {
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data,
            topic: topic,
        };

        const response = await messaging.send(message);
        console.log(`[Notification] Successfully sent message to topic '${topic}':`, response);
        return response;
    } catch (error) {
        console.error(`[Notification] Error sending message to topic '${topic}':`, error);
        throw error;
    }
}

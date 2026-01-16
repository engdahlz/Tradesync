export interface NotificationPayload {
    title: string;
    body: string;
    data?: {
        [key: string]: string;
    };
}
/**
 * Sends a push notification to a specific topic
 * @param topic The topic to subscribe to (e.g. 'signals')
 * @param payload The notification content
 */
export declare function sendTopicNotification(topic: string, payload: NotificationPayload): Promise<string>;
//# sourceMappingURL=notifications.d.ts.map
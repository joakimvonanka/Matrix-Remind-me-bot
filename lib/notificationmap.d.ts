/// <reference types="node" />
export declare class NotificationMap extends Map<string, Notification[]> {
    addNotification(sender: string, message: string, delay: number, timer: NodeJS.Timer): void;
    removeNotification(sender: string, timerNumber: number): Notification | undefined;
}
interface Notification {
    timer: NodeJS.Timer;
    message: string;
    timeout: number;
}
export {};

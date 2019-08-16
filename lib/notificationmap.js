"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NotificationMap extends Map {
    addNotification(sender, message, delay, timer) {
        if (!this.has(sender)) {
            this.set(sender, []);
        }
        const userArray = this.get(sender);
        userArray.push({
            timer,
            message,
            timeout: delay
        });
        this.set(sender, userArray);
    }
    removeNotification(sender, timerNumber) {
        if (!this.has(sender)) {
            return;
        }
        const userArray = this.get(sender);
        if (userArray.length < timerNumber) {
            return;
        }
        const [notif] = userArray.splice(timerNumber - 1, 1);
        this.set(sender, userArray);
        return notif;
    }
}
exports.NotificationMap = NotificationMap;

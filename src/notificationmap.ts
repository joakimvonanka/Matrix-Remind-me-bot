export class NotificationMap extends Map<string, Notification[]> {
    addNotification(sender:string, message:string, delay:number, timer:NodeJS.Timer) {
        if (!this.has(sender)) {
            this.set(sender, []);
        }
        const userArray = this.get(sender)!
        userArray.push({
            timer,
            message,
            timeout: delay
        })
        this.set(sender, userArray)
    } 

    removeNotification(sender:string, timerNumber:number) {
        if (!this.has(sender)) {
            return;
        }
        const userArray = this.get(sender)!
        if (userArray.length < timerNumber) {
            return;
        }
        const [notif] = userArray.splice(timerNumber-1, 1)
        this.set(sender, userArray)
        return notif;
    }
}

interface Notification {
    timer:NodeJS.Timer,
    message: string,
    timeout: number
}
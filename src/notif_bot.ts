import {
    MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, RichReply
} from "matrix-bot-sdk"
import markdown from "markdown-it"
import _ts from "timestring"
import { NotificationMap } from "./notificationmap";
import fs from "fs"
const timestring: (timestring: string, format: "ms") => number = _ts;
const md = markdown({});
class notif_bot {   
    private client!: MatrixClient
    private notifMap: NotificationMap = new NotificationMap()
    async main() {
        console.log("Its working")
        const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
        // where you would point a client to talk to a homeserver
        const homeserverUrl = config.homeserver;

        // see https://t2bot.io/docs/access_tokens
        const accessToken = config.accesstoken;

        // We'll want to make sure the bot doesn't have to do an initial sync every
        // time it restarts, so we need to prepare a storage provider. Here we use
        // a simple JSON database.
        const storage = new SimpleFsStorageProvider("notif_bot.json");

        // Now we can create the client and set it up to automatically join rooms.
        this.client = new MatrixClient(homeserverUrl, accessToken, storage);
        AutojoinRoomsMixin.setupOnClient(this.client);

        // We also want to make sure we can receive events - this is where we will
        // handle our command.
        this.client.on("room.message", (roomId, event)=> { 
            this.handleCommand(roomId, event);
        });

        // Now that the client is all set up and the event handler is registered, start the
        // client up. This will start it syncing.
        await this.client.start();

    } 


    // This is our event handler for dealing with the `!hello` command.
    async handleCommand(roomId:string, event:any) {
        // Don't handle events that don't have contents (they were probably redacted)
        if (!event["content"]) return;

        // Don't handle non-text events
        if (event["content"]["msgtype"] !== "m.text") return;

        // We never send `m.text` messages so this isn't required, however this is
        // how you would filter out events sent by the bot itself.
        if (event["sender"] === await this.client.getUserId()) return;

        // Make sure that the event looks like a command we're expecting
        const body: string = event["content"]["body"];

        if (!body) return;
        const commandArgs = body.split(" ");
        const command = commandArgs[0];
        if (command === "!setreminder") {
            const message = commandArgs.slice(2).join(" ");
            await this.setreminder(roomId, event, commandArgs[1], message);
        } else if (command === "!checkreminder") {
            await this.checkreminder(roomId, event)
        } else if (command === "!cancelreminder") {
            await this.cancelreminder(roomId, event, commandArgs[1])
        } else if (command === "!help") {
            await this.help(roomId, event)
        } else if (command === "!setinterval") {
            const message = commandArgs.slice(2).join(" ");
            await this.intervalreminder(roomId, event, commandArgs[1], message);
        } else if (command === "!cancelinterval") {
            await this.cancelinterval(roomId, event, commandArgs[1])
        }
        
    
     
    }
    async setreminder(roomId:string, event:any, timeString: string, message: string) {
        const millisecondsDelay = timestring(timeString, "ms");
        const replyBody = `Your reminder has been set. You will be reminded in ${millisecondsDelay}ms`
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply)
        const myTimeout = setTimeout(this.reminderActivated.bind(this, roomId, event, message), millisecondsDelay)
        this.notifMap.addNotification(event.sender, message, millisecondsDelay, myTimeout)
    }
    async intervalreminder(roomId:string, event:any, timeString:string, message:string) {
        const msdelay = timestring(timeString, "ms");
        const replyBody = `Your reminder has been set. You will be reminded in ${msdelay}ms`
        const reply = RichReply.createFor(roomId,event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
        const myInterval = setInterval(this.reminderActivated.bind(this, roomId, event, message), msdelay)
        this.notifMap.addNotification(event.sender, message, msdelay, myInterval)
    }
    async checkreminder(roomId:string, event:any) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender)) {
            const timers = this.notifMap.get(event.sender)!;
            replyBody = `You have a reminder(s) going: `
            for (const timer of timers) {
                replyBody += `- ${timer.message}`
                
            }
        } else {
            replyBody = "You have no reminders at the moment"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async cancelreminder(roomId:string, event:any, timerNumber:string) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender)) {
            const timer = this.notifMap.removeNotification(event.sender, parseInt(timerNumber))
            if (timer ) {
                clearTimeout(timer.timer)
                replyBody = "Your reminder has been removed"
            } else {
                replyBody = "Couldn't find reminder"
            }
        } else {
            replyBody = "You do not have a reminder going"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async cancelinterval(roomId:string, event:any, timerNumber:string) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender)) {
            const timer = this.notifMap.removeNotification(event.sernder, parseInt(timerNumber))
            if (timer ) {
                clearInterval(timer.timer)
                replyBody = "Your interval reminder has been removed"
            } else {
                replyBody = "Couldn't find reminder"
            }
        } else {
            replyBody = "You do not have a reminder going"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async help(roomId:string, event:any) {
        const replyBody = `
**!setreminder**: make a reminder. Usage: !setreminder <time><unit> <message>  
**!checkreminder**: check reminder status. Usage: !checkreminder  
**!cancelreminder**: cancel your reminder. Usage: !cancelreminder  
`
        const replyBodyHtml = md.render(replyBody);
        const reply = RichReply.createFor(roomId, event, replyBody, replyBodyHtml)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
        
    }
    async reminderActivated(roomId:string, event:any, message) {
        const replyBody = `REMINDER: ${message}`
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
}
new notif_bot().main().then(() => {
    console.log("It has started")
})


"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const matrix_bot_sdk_1 = require("matrix-bot-sdk");
const markdown_it_1 = __importDefault(require("markdown-it"));
const timestring_1 = __importDefault(require("timestring"));
const notificationmap_1 = require("./notificationmap");
const timestring = timestring_1.default;
const md = markdown_it_1.default({});
class notif_bot {
    constructor() {
        this.notifMap = new notificationmap_1.NotificationMap();
    }
    async main() {
        console.log("Its working");
        // where you would point a client to talk to a homeserver
        const homeserverUrl = "http://localhost:8008";
        // see https://t2bot.io/docs/access_tokens
        const accessToken = "MDAxN2xvY2F0aW9uIGxvY2FsaG9zdAowMDEzaWRlbnRpZmllciBrZXkKMDAxMGNpZCBnZW4gPSAxCjAwMjFjaWQgdXNlcl9pZCA9IEBib3Q6bG9jYWxob3N0CjAwMTZjaWQgdHlwZSA9IGFjY2VzcwowMDIxY2lkIG5vbmNlID0gTk5yOm5aVTtAanVhcT1lMgowMDJmc2lnbmF0dXJlIOerTmFmMZ2xHHlY_crSNqk3oLDIJI4CRZ_6IBpYfTRvCg";
        // We'll want to make sure the bot doesn't have to do an initial sync every
        // time it restarts, so we need to prepare a storage provider. Here we use
        // a simple JSON database.
        const storage = new matrix_bot_sdk_1.SimpleFsStorageProvider("notif_bot.json");
        // Now we can create the client and set it up to automatically join rooms.
        this.client = new matrix_bot_sdk_1.MatrixClient(homeserverUrl, accessToken, storage);
        matrix_bot_sdk_1.AutojoinRoomsMixin.setupOnClient(this.client);
        // We also want to make sure we can receive events - this is where we will
        // handle our command.
        this.client.on("room.message", (roomId, event) => {
            this.handleCommand(roomId, event);
        });
        // Now that the client is all set up and the event handler is registered, start the
        // client up. This will start it syncing.
        await this.client.start();
    }
    // This is our event handler for dealing with the `!hello` command.
    async handleCommand(roomId, event) {
        // Don't handle events that don't have contents (they were probably redacted)
        if (!event["content"])
            return;
        // Don't handle non-text events
        if (event["content"]["msgtype"] !== "m.text")
            return;
        // We never send `m.text` messages so this isn't required, however this is
        // how you would filter out events sent by the bot itself.
        if (event["sender"] === await this.client.getUserId())
            return;
        // Make sure that the event looks like a command we're expecting
        const body = event["content"]["body"];
        if (!body)
            return;
        const commandArgs = body.split(" ");
        const command = commandArgs[0];
        if (command === "!setreminder") {
            const message = commandArgs.slice(2).join(" ");
            await this.setreminder(roomId, event, commandArgs[1], message);
        }
        else if (command === "!checkreminder") {
            await this.checkreminder(roomId, event);
        }
        else if (command === "!cancelreminder") {
            await this.cancelreminder(roomId, event, commandArgs[1]);
        }
        else if (command === "!help") {
            await this.help(roomId, event);
        }
        else if (command === "!setinterval") {
            const message = commandArgs.slice(2).join(" ");
            await this.intervalreminder(roomId, event, commandArgs[1], message);
        }
        else if (command === "!cancelinterval") {
            await this.cancelinterval(roomId, event, commandArgs[1]);
        }
    }
    async setreminder(roomId, event, timeString, message) {
        const millisecondsDelay = timestring(timeString, "ms");
        const replyBody = `Your reminder has been set. You will be reminded in ${millisecondsDelay}ms`;
        const reply = matrix_bot_sdk_1.RichReply.createFor(roomId, event, replyBody, replyBody);
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply);
        const myTimeout = setTimeout(this.reminderActivated.bind(this, roomId, event, message), millisecondsDelay);
        this.notifMap.addNotification(event.sender, message, millisecondsDelay, myTimeout);
    }
    async intervalreminder(roomId, event, timeString, message) {
        const msdelay = timestring(timeString, "ms");
        const replyBody = `Your reminder has been set. You will be reminded in ${msdelay}ms`;
        const reply = matrix_bot_sdk_1.RichReply.createFor(roomId, event, replyBody, replyBody);
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply);
        const myInterval = setInterval(this.reminderActivated.bind(this, roomId, event, message), msdelay);
        this.notifMap.addNotification(event.sender, message, msdelay, myInterval);
    }
    async checkreminder(roomId, event) {
        let replyBody = "You have a bug";
        if (this.notifMap.has(event.sender)) {
            const timers = this.notifMap.get(event.sender);
            replyBody = `You have a reminder(s) going: `;
            for (const timer of timers) {
                replyBody += `- ${timer.message}`;
            }
        }
        else {
            replyBody = "You have no reminders at the moment";
        }
        const reply = matrix_bot_sdk_1.RichReply.createFor(roomId, event, replyBody, replyBody);
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply);
    }
    async cancelreminder(roomId, event, timerNumber) {
        let replyBody = "You have a bug";
        if (this.notifMap.has(event.sender)) {
            const timer = this.notifMap.removeNotification(event.sender, parseInt(timerNumber));
            if (timer) {
                clearTimeout(timer.timer);
                replyBody = "Your reminder has been removed";
            }
            else {
                replyBody = "Couldn't find reminder";
            }
        }
        else {
            replyBody = "You do not have a reminder going";
        }
        const reply = matrix_bot_sdk_1.RichReply.createFor(roomId, event, replyBody, replyBody);
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply);
    }
    async cancelinterval(roomId, event, timerNumber) {
        let replyBody = "You have a bug";
        if (this.notifMap.has(event.sender)) {
            const timer = this.notifMap.removeNotification(event.sernder, parseInt(timerNumber));
            if (timer) {
                clearInterval(timer.timer);
                replyBody = "Your interval reminder has been removed";
            }
            else {
                replyBody = "Couldn't find reminder";
            }
        }
        else {
            replyBody = "You do not have a reminder going";
        }
        const reply = matrix_bot_sdk_1.RichReply.createFor(roomId, event, replyBody, replyBody);
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply);
    }
    async help(roomId, event) {
        const replyBody = `
**!setreminder**: make a reminder. Usage: !setreminder <time><unit> <message>  
**!checkreminder**: check reminder status. Usage: !checkreminder  
**!cancelreminder**: cancel your reminder. Usage: !cancelreminder  
`;
        const replyBodyHtml = md.render(replyBody);
        const reply = matrix_bot_sdk_1.RichReply.createFor(roomId, event, replyBody, replyBodyHtml);
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply);
    }
    async reminderActivated(roomId, event, message) {
        const replyBody = `REMINDER: ${message}`;
        const reply = matrix_bot_sdk_1.RichReply.createFor(roomId, event, replyBody, replyBody);
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply);
    }
}
new notif_bot().main().then(() => {
    console.log("It has started");
});

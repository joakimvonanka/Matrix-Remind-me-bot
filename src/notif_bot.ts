import {
    MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, RichReply
} from "matrix-bot-sdk"
import markdown from "markdown-it"
import _ts from "timestring"

const timestring: (timestring: string, format: "ms") => number = _ts;

interface notification {
    timer:NodeJS.Timer,
    message: string,
    timeout: number
}
const md = markdown({});
class notif_bot {   
    private client!: MatrixClient
    private notifMap: Map<string, notification> = new Map();
    async main() {
        console.log("Its working")
        // where you would point a client to talk to a homeserver
        const homeserverUrl = "http://localhost:8008";

        // see https://t2bot.io/docs/access_tokens
        const accessToken = "MDAxN2xvY2F0aW9uIGxvY2FsaG9zdAowMDEzaWRlbnRpZmllciBrZXkKMDAxMGNpZCBnZW4gPSAxCjAwMjFjaWQgdXNlcl9pZCA9IEBib3Q6bG9jYWxob3N0CjAwMTZjaWQgdHlwZSA9IGFjY2VzcwowMDIxY2lkIG5vbmNlID0gTk5yOm5aVTtAanVhcT1lMgowMDJmc2lnbmF0dXJlIOerTmFmMZ2xHHlY_crSNqk3oLDIJI4CRZ_6IBpYfTRvCg";

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
            await this.cancelreminder(roomId, event)
        } else if (command === "!help") {
            await this.help(roomId, event)
        }
        
    
     
    }
    async setreminder(roomId:string, event:any, timeString: string, message: string) {
        const millisecondsDelay = timestring(timeString, "ms");
        const replyBody = `Your reminder has been set. You will be reminded in ${millisecondsDelay}ms`
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice";
        await this.client.sendMessage(roomId, reply)
        const myTimeout = setTimeout(this.reminderActivated.bind(this, roomId, event, message), millisecondsDelay)
        this.notifMap.set(event.sender, {
            timer : myTimeout,
            message,
            timeout: millisecondsDelay
        });
    }
    async checkreminder(roomId:string, event:any) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender)) {
            const timer = this.notifMap.get(event.sender);
            replyBody = `You have a reminder going: ${timer!.message}`
        } else {
            replyBody = "You have no reminders at the moment"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async cancelreminder(roomId:string, event:any) {
        let replyBody = "You have a bug"
        if (this.notifMap.has(event.sender)) {
            clearTimeout(this.notifMap.get(event.sender)!.timer)
            this.notifMap.delete(event.sender)
            replyBody = "Your reminder has been removed" 
        } else {
            replyBody = "You do not have a reminder going"
        }
        const reply = RichReply.createFor(roomId, event, replyBody, replyBody)
        reply["msgtype"] = "m.notice"
        await this.client.sendMessage(roomId, reply)
    }
    async help(roomId:string, event:any) {
        const replyBody = `
**!setreminder**: make a reminder. Usage: !setreminder <time><time unit><message>  
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


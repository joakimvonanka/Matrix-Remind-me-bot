# Matrix-Remind-me-bot

A [Matrix](https://matrix.org) bot using
[matrix-bot-sdk](https://github.com/turt2live/matrix-js-bot-sdk) to send
reminders to users.

## Installation

1. `git clone https://github.com/joakimvonanka/Matrix-Remind-me-bot.git`
2. `cd /Matrix-Remind-me-bot.git`
3. `npm install`
4. `npm run build`


## Configuration

1. Create a `config.json` file in the root directory.
2. In the config.json paste this in:

```
{
    "accesstoken":"",
    "homeserver":""
}
```

3. Add your access token in the `""`, and the same for the homeserver url.
4. To run the bot type `npm start`

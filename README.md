# Telegraf-Question
This package allows you to ask users questions and get an answer with Promise.

## Install

```$ npm i telegraf-question```

```$ yarn add telegraf-question```

## Documentation

```typescript
TelegrafContext.ask(
    question: { text: string; extra?: ExtraReplyMessage } | string,
    cancel?: ((ctx: TelegrafContext) => Promise<boolean> | boolean) | string | null,
    type: 'text' | 'number' | 'callback_query' = 'text',
    errorText: { text: string; extra?: ExtraReplyMessage } | string | null = null,
    filter?: (ctx: TelegrafContext) => Promise<boolean> | boolean
): Promise<TelegrafContext | null> // returns null on cancel
```

## Example
```typescript
import Telegraf, { Markup } from "telegraf";
import TelegrafQuestion from "telegraf-question";

let username = 'user';
let age = 0;
let online = false;

let bot = new Telegraf(<BOT_TOKEN>);
bot.use(TelegrafQuestion());

bot.action('change_username', async (ctx, next) => {
    ctx.answerCbQuery();
    let newUsername = await ctx.ask('Send new username:');
    username = newUsername.message.text;
    next();
});

bot.action('change_age', async (ctx, next) => {
    ctx.answerCbQuery();
    let newAge = await ctx.ask(
        {
            text: 'Send new age:',
            extra: {
                reply_markup: Markup.keyboard(['Cancel']).resize(),
            }
        },
        'Cancel',
        'number',
        'Please send a whole number.',
        (ctx) => {
            let num = parseInt(ctx.message?.text);
            return num >= 0;
        }
    );

    if (newAge !== null) {
        age = parseInt(newAge.message.text);
    }
    next();
});

bot.action('change_online', async (ctx, next) => {
    ctx.answerCbQuery();
    let status = await ctx.ask(
        {
            text: '<b>Select status:</b>',
            extra: {
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.callbackButton('Online', 'online'),
                        Markup.callbackButton('Offline', 'offline'),
                    ],
                    [Markup.callbackButton('Cancel', 'cancel_status')]
                ]),
                parse_mode: 'HTML'
            }
        },
        (ctx) => ctx.callbackQuery?.data === 'cancel_status',
        'callback_query',
        null,
        (ctx) => ['online', 'offline'].some(el => ctx.callbackQuery.data === el),
    );
    
    if (status !== null) {
        status.answerCbQuery();
        online = status.callbackQuery.data === 'online';
    }
    next();
});

bot.use((ctx) => {
    ctx.reply(`Hi ${username}.\nAge: ${age}\nOnline: ${online ? 'Yes' : 'No'}`, Markup.inlineKeyboard([
        [Markup.callbackButton('Change username', 'change_username')],
        [Markup.callbackButton('Change age', 'change_age')],
        [Markup.callbackButton('Change online', 'change_online')],
    ]).extra());
});

bot.launch();
```
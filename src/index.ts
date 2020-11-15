import { Middleware } from "telegraf/typings/composer";
import { TelegrafContext } from "telegraf/typings/context";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";

const defaultFilters = {
    'text': (ctx: TelegrafContext) => (ctx.message?.text?.length ?? 0) > 0,
    'number': (ctx: TelegrafContext) => defaultFilters['text'](ctx) && !Number.isNaN(parseFloat(ctx.message.text)),
    'callback_query': (ctx: TelegrafContext) => typeof ctx.callbackQuery !== 'undefined',
};

export default function TelegrafQuestion<TContext extends TelegrafContext>(): Middleware<TContext> {
    let wasAsked: {
        [key: string]: any
    } = {};

    return async (ctx, next) => {
        if (ctx.chat.id in wasAsked) {
            await wasAsked[ctx.chat.id].next(ctx);
        } else {

            ctx.ask = async (
                question: { text: string; extra?: ExtraReplyMessage } | string,
                cancel?: ((ctx: TelegrafContext) => Promise<boolean> | boolean) | string | null,
                type: 'text' | 'number' | 'callback_query' = 'text',
                errorText: { text: string; extra?: ExtraReplyMessage } | string | null = null,
                filter?: (ctx: TelegrafContext) => Promise<boolean> | boolean
            ): Promise<TelegrafContext | null> => {

                let cancelFunction = (ctx: TelegrafContext) => {
                    if (typeof cancel !== 'undefined' && cancel !== null) {
                        if (typeof cancel === 'string') {
                            return ctx.message?.text === cancel;
                        } else {
                            return cancel(ctx);
                        }
                    }
                    return false;
                };

                return await new Promise<TelegrafContext>((resolve) => {
                    async function* answer() {
                        let filterResult = false;
                        while (!filterResult) {
                            let ctx: TelegrafContext = yield filterResult;
                            filterResult = (await defaultFilters[type](ctx)) && (typeof filter === 'undefined' ? true : await filter(ctx));
                            let isCancelled = cancelFunction(ctx);
                            if (filterResult || isCancelled) {
                                if (isCancelled) {
                                    resolve(null);
                                } else {
                                    resolve(ctx)
                                }
                                delete wasAsked[ctx.chat.id];
                                return filterResult;
                            }
                            if (!filterResult && errorText !== null) {
                                if (typeof errorText === 'string') {
                                    ctx.reply(errorText);
                                } else {
                                    ctx.reply(errorText.text, errorText.extra);
                                }
                            }
                        }
                    }
                    if (ctx.chat.id in wasAsked) {
                        throw new Error('Question already asked for chat ' + ctx.from.id);
                    }

                    let ask = answer();
                    ask.next();

                    wasAsked[ctx.chat.id] = ask;
                    if (typeof question === 'string') {
                        ctx.reply(question);
                    } else {
                        ctx.reply(question.text, question.extra);
                    }
                });

            };

            return await next();
        }
    }
}

declare module 'telegraf/typings/context' {
    interface TelegrafContext {
        ask: (
            question: { text: string; extra?: ExtraReplyMessage } | string,
            cancel?: ((ctx: TelegrafContext) => Promise<boolean> | boolean) | string | null,
            type?: 'text' | 'number' | 'callback_query',
            errorText?: { text: string; extra?: ExtraReplyMessage } | string | null,
            filter?: (ctx: TelegrafContext) => Promise<boolean> | boolean,
        ) => Promise<TelegrafContext> | Promise<null>;
    }
}
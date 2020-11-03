import { Middleware } from "telegraf/typings/composer";
import { TelegrafContext } from "telegraf/typings/context";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";

const defaultFilters = {
    'text': (ctx: TelegrafContext) => (ctx.message?.text?.length ?? 0) > 0,
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
                type: 'text' = 'text',
                errorText: { text: string; extra?: ExtraReplyMessage } | string | null = null,
                filter?: (ctx: TelegrafContext) => Promise<boolean> | boolean
            ): Promise<TelegrafContext> => {

                return await new Promise<TelegrafContext>((resolve) => {
                    async function* answer() {
                        let filterResult = false;
                        while (!filterResult) {
                            let ctx: TelegrafContext = yield filterResult;
                            filterResult = (await defaultFilters[type]) && (typeof filter === 'undefined' ? true : await filter(ctx));
                            if (!filterResult && errorText !== null) {
                                if (typeof errorText === 'string') {
                                    ctx.reply(errorText);
                                } else {
                                    ctx.reply(errorText.text, errorText.extra);
                                }
                            }
                            if (filterResult) {
                                resolve(ctx);
                                delete wasAsked[ctx.chat.id];
                                return filterResult;
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

            next();
        }
    }
}

declare module 'telegraf/typings/context' {
    interface TelegrafContext {
        ask: (
            question: { text: string; extra?: ExtraReplyMessage } | string,
            type?: 'text',
            errorText?: { text: string; extra?: ExtraReplyMessage } | string | null,
            filter?: (ctx: TelegrafContext) => Promise<boolean> | boolean,
        ) => Promise<TelegrafContext>;
    }
}
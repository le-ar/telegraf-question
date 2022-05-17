import { Middleware } from "telegraf/typings/middleware";
import { Context } from "telegraf/typings/context";
import { ExtraReplyMessage } from "telegraf/typings/telegram-types";
export default function TelegrafQuestion<TContext extends Context>(config?: {
    cancelTimeout?: number;
}): Middleware<TContext>;
declare module 'telegraf/typings/context' {
    interface Context {
        ask: (question: {
            text: string;
            extra?: ExtraReplyMessage;
        } | string, cancel?: ((ctx: any) => Promise<boolean> | boolean) | string | null, type?: 'text' | 'number' | 'callback_query', errorText?: {
            text: string;
            extra?: ExtraReplyMessage;
        } | string | null, filter?: (ctx: any) => Promise<boolean> | boolean) => Promise<Context> | Promise<null>;
    }
}

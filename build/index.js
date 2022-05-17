"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultFilters = {
    'any': (ctx) => true,
    'text': (ctx) => (ctx.message?.text?.length ?? 0) > 0,
    'number': (ctx) => defaultFilters['text'](ctx) && !Number.isNaN(parseFloat(ctx.message.text)),
    'callback_query': (ctx) => typeof ctx.callbackQuery !== 'undefined',
};
function TelegrafQuestion(config) {
    let wasAsked = {};
    let cancelTime = config?.cancelTimeout ?? -1;
    return async (ctx, next) => {
        if (ctx.chat.id in wasAsked) {
            await wasAsked[ctx.chat.id].next(ctx);
        }
        else {
            ctx.ask = async (question, cancel, type = 'text', errorText = null, filter) => {
                let cancelFunction = (ctx) => {
                    if (typeof cancel !== 'undefined' && cancel !== null) {
                        if (typeof cancel === 'string') {
                            return ctx.message?.text === cancel;
                        }
                        else {
                            return cancel(ctx);
                        }
                    }
                    return false;
                };
                let chatId = ctx.chat.id;
                return await new Promise((resolve) => {
                    let cancelTimeoutObj = {};
                    async function* answer() {
                        let filterResult = false;
                        while (!filterResult) {
                            let ctx = yield filterResult;
                            if (ctx === cancelTimeoutObj) {
                                resolve(null);
                                delete wasAsked[chatId];
                                return filterResult;
                            }
                            filterResult = (await defaultFilters[type](ctx)) && (typeof filter === 'undefined' ? true : await filter(ctx));
                            let isCancelled = cancelFunction(ctx);
                            if (filterResult || isCancelled) {
                                if (isCancelled) {
                                    resolve(null);
                                }
                                else {
                                    resolve(ctx);
                                }
                                delete wasAsked[ctx.chat.id];
                                return filterResult;
                            }
                            if (!filterResult && errorText !== null) {
                                if (typeof errorText === 'string') {
                                    ctx.reply(errorText);
                                }
                                else {
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
                    }
                    else {
                        ctx.reply(question.text, question.extra);
                    }
                    if (cancelTime > 0) {
                        setTimeout(() => {
                            if (wasAsked[ctx.chat.id] === ask) {
                                ask.next(cancelTimeoutObj);
                            }
                        }, cancelTime);
                    }
                });
            };
            return await next();
        }
    };
}
exports.default = TelegrafQuestion;
//# sourceMappingURL=index.js.map
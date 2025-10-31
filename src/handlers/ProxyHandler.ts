import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "./AbstractMessageHandler";
import { MessageHandler } from "./interfaces/MessageHandler";

class ProxyHandler extends AbstractMessageHandler {
    private forMeHandler: MessageHandler;
    private forOtherPeopleHandler: MessageHandler;
    private forGroupHandler: MessageHandler;

    public constructor(forMeHandler: MessageHandler,forOtherPeopleHandler: MessageHandler, forGroupHandler: MessageHandler) {
        super();
        this.forMeHandler = forMeHandler;
        this.forOtherPeopleHandler = forOtherPeopleHandler;
        this.forGroupHandler = forGroupHandler;
    }
    public async handle(message: Message, client: Client): Promise<void> {
        console.log(message.from)
        if(message.fromMe) {
            await this.forMeHandler.handle(message, client);
        } else if(message.from.includes('@g.us')) {
            await this.forGroupHandler.handle(message, client);
        } else {
            await this.forOtherPeopleHandler.handle(message, client);
        }
        await super.handle(message, client);
    }

}
export { ProxyHandler };
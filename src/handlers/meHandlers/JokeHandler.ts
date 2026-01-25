import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";

export class JokeHandler extends AbstractMessageHandler {
    private jokes: string[] = [
        "Why don’t scientists trust atoms? Because they make up everything!",
        "Why did the scarecrow win an award? Because he was outstanding in his field!",
        "Why don't skeletons fight each other? They don't have the guts.",
        "What do you call fake spaghetti? An Impasta!"
    ];

    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!joke') {
            const randomJoke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
            await message.reply(randomJoke);
        } else {
            await super.handle(message, client)
        }
    }
}

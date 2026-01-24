import { Client, Message } from 'whatsapp-web.js';
import { AbstractMessageHandler } from '../AbstractMessageHandler';
import axios from 'axios';

class JokeHandler extends AbstractMessageHandler {
    private lastJokeTimestamp: number | null = null;
    private readonly JOKE_COOLDOWN = 60000; // 1 minute in milliseconds

    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase() === '!joke') {
            const now = Date.now();
            if (this.lastJokeTimestamp && now - this.lastJokeTimestamp < this.JOKE_COOLDOWN) {
                const remainingTime = Math.ceil((this.JOKE_COOLDOWN - (now - this.lastJokeTimestamp)) / 1000);
                await message.reply(`Please wait ${remainingTime} seconds before telling another joke.`);
                return;
            }

            try {
                const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
                const joke = response.data;
                const jokeMessage = `${joke.setup}\n\n${joke.punchline}`;
                this.lastJokeTimestamp = now;
                await message.reply(jokeMessage);
            } catch (error) {
                console.error('Error fetching joke:', error);
                await message.reply('Sorry, I couldn\'t fetch a joke right now. Please try again later.');
            }
        } else {
            await super.handle(message, client);
        }
    }
}

export { JokeHandler };

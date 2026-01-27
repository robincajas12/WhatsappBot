import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

interface Joke {
  error: boolean;
  category: string;
  type: 'single' | 'twopart';
  joke?: string;
  setup?: string;
  delivery?: string;
  flags: {
    nsfw: boolean;
    religious: boolean;
    political: boolean;
    racist: boolean;
    sexist: boolean;
    explicit: boolean;
  };
  id: number;
  safe: boolean;
  lang: string;
}

export class JokeHandler extends AbstractMessageHandler {
  public async handle(message: Message, client: Client): Promise<void> {
    if (message.body.toLowerCase() === '!joke') {
      try {
        const response = await axios.get<Joke>('https://sv443.net/jokeapi/v2/joke/Any?safe-mode');
        const jokeData = response.data;

        if (jokeData.error) {
          await client.sendMessage(message.from, "Sorry, I couldn't fetch a joke at the moment. Please try again later.");
          return;
        }

        if (jokeData.type === 'single') {
          await client.sendMessage(message.from, jokeData.joke!);
        } else {
          await client.sendMessage(message.from, `${jokeData.setup}\n\n${jokeData.delivery}`);
        }
      } catch (error) {
        console.error('Error fetching joke:', error);
        await client.sendMessage(message.from, "Sorry, I couldn't fetch a joke at the moment. Please try again later.");
      }
      return;
    }

    await super.handle(message, client);
  }
}

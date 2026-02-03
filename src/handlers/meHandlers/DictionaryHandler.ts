import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class DictionaryHandler extends AbstractMessageHandler {
  public async handle(message: Message, client: Client): Promise<void> {
    const dictionaryRegex = /!define\s+(.+)/i;
    const match = message.body.match(dictionaryRegex);

    if (match) {
      const word = match[1].toLowerCase();
      try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = response.data;

        if (Array.isArray(data) && data.length > 0) {
          const entry = data[0];
          const definition = entry.meanings[0].definitions[0].definition;
          await message.reply(`*Definición (EN) de "${word}":*\n${definition}`);
        } else {
          await message.reply(`No se encontró la definición de: ${word}`);
        }
      } catch (error) {
        console.error('Error fetching definition:', error);
        await message.reply("No pude encontrar una definición para esa palabra.");
      }
      return;
    }

    await super.handle(message, client);
  }
}

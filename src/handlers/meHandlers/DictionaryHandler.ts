import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class DictionaryHandler extends AbstractMessageHandler {
  public async handle(message: Message, client: Client): Promise<void> {
    const dictionaryRegex = /^!define\s+(\w+)/i;
    const match = message.body.match(dictionaryRegex);

    if (match) {
      const word = match[1].toLowerCase();
      try {
        const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const data = response.data;

        if (Array.isArray(data) && data.length > 0) {
          const firstEntry = data[0];
          const definition = firstEntry.meanings[0].definitions[0].definition;
          const phonetic = firstEntry.phonetic || "";

          let reply = `*${word.toUpperCase()}* ${phonetic}\n\n${definition}`;

          if (firstEntry.meanings[0].definitions[0].example) {
            reply += `\n\n_Ejemplo: ${firstEntry.meanings[0].definitions[0].example}_`;
          }

          await client.sendMessage(message.from, reply);
        } else {
          await client.sendMessage(message.from, `Lo siento, no pude encontrar la definición de "${word}".`);
        }
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
            await client.sendMessage(message.from, `Lo siento, no pude encontrar la definición de "${word}".`);
        } else {
            console.error('Error fetching definition:', error);
            await client.sendMessage(message.from, "Lo siento, no pude obtener la definición en este momento.");
        }
      }
      return;
    }

    await super.handle(message, client);
  }
}

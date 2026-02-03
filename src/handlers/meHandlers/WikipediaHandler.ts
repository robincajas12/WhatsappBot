import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class WikipediaHandler extends AbstractMessageHandler {
  public async handle(message: Message, client: Client): Promise<void> {
    const wikiRegex = /!wiki\s+(.+)/i;
    const match = message.body.match(wikiRegex);

    if (match) {
      const query = match[1];
      try {
        const response = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        const data = response.data;

        if (data.extract) {
          const reply = `*${data.displaytitle}*\n\n${data.extract}\n\nLeer más: ${data.content_urls.desktop.page}`;
          await message.reply(reply);
        } else {
          await message.reply(`No se encontró información en Wikipedia para: ${query}`);
        }
      } catch (error) {
        console.error('Error fetching Wikipedia summary:', error);
        await message.reply("Hubo un error al buscar en Wikipedia.");
      }
      return;
    }

    await super.handle(message, client);
  }
}

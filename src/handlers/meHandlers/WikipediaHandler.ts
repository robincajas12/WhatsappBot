import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class WikipediaHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        const wikiRegex = /^!wiki\s+(.+)$/i;
        const match = message.body.match(wikiRegex);

        if (match) {
            const query = match[1];
            try {
                const response = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);

                if (response.data && response.data.extract) {
                    const title = response.data.title;
                    const extract = response.data.extract;
                    const url = response.data.content_urls.desktop.page;

                    await message.reply(`*${title}*\n\n${extract}\n\nLeer más: ${url}`);
                } else {
                    await message.reply("No pude encontrar un resumen para ese término en Wikipedia.");
                }
            } catch (error: any) {
                if (error.response && error.response.status === 404) {
                    await message.reply("No se encontró ningún artículo en Wikipedia para ese término.");
                } else {
                    console.error("Error fetching Wikipedia summary:", error);
                    await message.reply("Ocurrió un error al buscar en Wikipedia. Inténtalo de nuevo más tarde.");
                }
            }
        } else {
            await super.handle(message, client);
        }
    }
}

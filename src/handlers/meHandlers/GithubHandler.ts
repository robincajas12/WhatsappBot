import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class GithubHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!github ')) {
            const repo = message.body.slice(8).trim();
            try {
                const response = await axios.get(`https://api.github.com/repos/${repo}`);
                const data = response.data;
                const info = `*${data.full_name}*\n\n` +
                             `${data.description || 'Sin descripción'}\n\n` +
                             `⭐ Estrellas: ${data.stargazers_count}\n` +
                             `🍴 Forks: ${data.forks_count}\n` +
                             `📝 Lenguaje: ${data.language || 'N/A'}\n` +
                             `🔗 URL: ${data.html_url}`;
                await message.reply(info);
            } catch (error) {
                console.error("Error fetching Github info:", error);
                await message.reply("No se pudo encontrar el repositorio o hubo un error. Asegúrate de usar el formato: usuario/repositorio");
            }
        } else {
            await super.handle(message, client);
        }
    }
}

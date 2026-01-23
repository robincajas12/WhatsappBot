import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class NewsHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        const newsRegex = /!news/i;
        const match = message.body.match(newsRegex);

        if (match) {
            try {
                const headlines = await this.getTopHeadlines();
                if (!headlines) {
                    await message.reply("Sorry, I couldn't retrieve the news headlines.");
                    return;
                }

                await message.reply(headlines);
            } catch (error) {
                console.error("Error fetching news:", error);
                await message.reply("An error occurred while fetching the news. Please try again later.");
            }
        } else {
            await super.handle(message, client);
        }
    }

    private async getTopHeadlines(): Promise<string | null> {
        try {
            const apiKey = process.env.NEWS_API_KEY;
            if (!apiKey) {
                return "NEWS_API_KEY is not set in the environment variables.";
            }
            const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);

            if (response.data && response.data.articles) {
                const articles = response.data.articles.slice(0, 5);
                const headlines = articles.map((article: any) => `*${article.title}*\n${article.url}`);
                return `*Top 5 Headlines*\n\n${headlines.join("\n\n")}`;
            }

            return null;
        } catch (error) {
            console.error("News API error:", error);
            return null;
        }
    }
}

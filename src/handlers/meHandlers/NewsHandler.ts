import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

interface NewsArticle {
    title: string;
    url: string;
}

export class NewsHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        const newsRegex = /!news(?:\s+(.+))?/i;
        const match = message.body.match(newsRegex);

        if (match) {
            const args = match[1] ? match[1].split(/\s+/) : [];
            const category = args[0] || 'general';
            const country = args[1] || 'us';

            try {
                const news = await this.getNews(category, country);
                if (!news) {
                    await message.reply("Sorry, I couldn't retrieve the news.");
                    return;
                }

                await message.reply(news);
            } catch (error) {
                console.error("Error fetching news:", error);
                await message.reply("An error occurred while fetching the news. Please try again later.");
            }
        } else {
            await super.handle(message, client);
        }
    }

    private async getNews(category: string, country: string): Promise<string | null> {
        try {
            const response = await axios.get(`https://saurav.tech/NewsAPI/top-headlines/category/${category}/${country}.json`);
            if (response.data && response.data.articles && response.data.articles.length > 0) {
                const articles = response.data.articles.slice(0, 5); // Get top 5 articles
                let newsReply = `*Top 5 news headlines for ${category} in ${country}:*\n\n`;
                articles.forEach((article: NewsArticle, index: number) => {
                    newsReply += `${index + 1}. *${article.title}*\n`;
                    newsReply += `${article.url}\n\n`;
                });
                return newsReply;
            }
            return null;
        } catch (error) {
            console.error("News API error:", error);
            return null;
        }
    }
}

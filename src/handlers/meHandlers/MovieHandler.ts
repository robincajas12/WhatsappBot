import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class MovieHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!movie')) {
            const movieTitle = message.body.substring(7).trim();

            if (!movieTitle) {
                await client.sendMessage(message.from, "Please provide a movie title. Usage: !movie <title>");
                return;
            }

            const apiKey = process.env.MOVIE_API_KEY;
            if (!apiKey) {
                console.error("MOVIE_API_KEY is not set in the environment variables.");
                await client.sendMessage(message.from, "Sorry, the movie feature is currently unavailable.");
                return;
            }

            try {
                const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
                    params: {
                        api_key: apiKey,
                        query: movieTitle,
                        page: 1
                    }
                });

                if (response.data && response.data.results.length > 0) {
                    const movie = response.data.results[0];
                    const movieDetails = `🎬 *${movie.title}* (${movie.release_date.substring(0, 4)})\n\n` +
                                       `⭐ *Rating:* ${movie.vote_average}/10\n\n` +
                                       `*Overview:*\n${movie.overview}`;
                    await client.sendMessage(message.from, movieDetails);
                } else {
                    await client.sendMessage(message.from, `Sorry, I couldn't find any information for "${movieTitle}".`);
                }
            } catch (error) {
                console.error("Error fetching movie data:", error);
                await client.sendMessage(message.from, "Sorry, there was an error fetching movie information.");
            }
            return;
        }
        await super.handle(message, client);
    }
}

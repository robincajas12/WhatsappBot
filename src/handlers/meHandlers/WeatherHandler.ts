import { Client, Message } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import axios from "axios";

export class WeatherHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        const weatherRegex = /!weather\s+(.+)/i;
        const match = message.body.match(weatherRegex);

        if (match) {
            const location = match[1];
            try {
                const coordinates = await this.getCoordinates(location);
                if (!coordinates) {
                    await message.reply("Sorry, I couldn't find that location.");
                    return;
                }

                const forecast = await this.getWeatherForecast(coordinates.latitude, coordinates.longitude);
                if (!forecast) {
                    await message.reply("Sorry, I couldn't retrieve the weather forecast.");
                    return;
                }

                await message.reply(forecast);
            } catch (error) {
                console.error("Error fetching weather:", error);
                await message.reply("An error occurred while fetching the weather. Please try again later.");
            }
        } else {
            await super.handle(message, client);
        }
    }

    private async getCoordinates(location: string): Promise<{ latitude: number; longitude: number } | null> {
        try {
            const response = await axios.get(`https://geocode.maps.co/search?q=${encodeURIComponent(location)}`);
            if (response.data && response.data.length > 0) {
                const { lat, lon } = response.data[0];
                return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
            }
            return null;
        } catch (error) {
            console.error("Geocoding error:", error);
            return null;
        }
    }

    private async getWeatherForecast(latitude: number, longitude: number): Promise<string | null> {
        try {
            const pointsResponse = await axios.get(`https://api.weather.gov/points/${latitude},${longitude}`, {
                headers: { 'User-Agent': '(my-whatsapp-bot, myemail@example.com)' }
            });

            const forecastUrl = pointsResponse.data.properties.forecast;
            const forecastResponse = await axios.get(forecastUrl, {
                headers: { 'User-Agent': '(my-whatsapp-bot, myemail@example.com)' }
            });

            const firstPeriod = forecastResponse.data.properties.periods[0];
            const forecast = `*Weather for ${pointsResponse.data.properties.relativeLocation.properties.city}, ${pointsResponse.data.properties.relativeLocation.properties.state}*\n\n` +
                             `*${firstPeriod.name}:* ${firstPeriod.detailedForecast}`;

            return forecast;
        } catch (error) {
            console.error("Weather forecast error:", error);
            return null;
        }
    }
}

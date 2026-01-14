import { Client, Message, MessageMedia } from "whatsapp-web.js";
import { AbstractMessageHandler } from "../AbstractMessageHandler";
import PdfPrinter from "pdfmake";
import * as path from "path";

export class PdfHandler extends AbstractMessageHandler {
    public async handle(message: Message, client: Client): Promise<void> {
        if (message.body.toLowerCase().startsWith('!pdf')) {
            const text = message.body.substring(5); // Remove '!pdf '
            if (!text) {
                await client.sendMessage(message.from, "Please provide some text to convert to PDF.");
                return;
            }

            const fonts = {
                Roboto: {
                    normal: path.resolve('assets/fonts/Roboto-Regular.ttf'),
                    bold: path.resolve('assets/fonts/Roboto-Bold.ttf'),
                    italics: path.resolve('assets/fonts/Roboto-Italic.ttf'),
                    bolditalics: path.resolve('assets/fonts/Roboto-BoldItalic.otf')
                }
            };

            const printer = new PdfPrinter(fonts);

            const docDefinition = {
                content: [
                    { text: text, style: 'normal' }
                ],
                defaultStyle: {
                    font: 'Roboto'
                }
            };

            const pdfDoc = printer.createPdfKitDocument(docDefinition);

            const chunks: any[] = [];
            pdfDoc.on('data', chunk => {
                chunks.push(chunk);
            });
            pdfDoc.on('end', async () => {
                const result = Buffer.concat(chunks);
                const media = new MessageMedia('application/pdf', result.toString('base64'), 'document.pdf');
                await client.sendMessage(message.from, media);
            });
            pdfDoc.end();
            return;
        }
        await super.handle(message, client);
    }
}

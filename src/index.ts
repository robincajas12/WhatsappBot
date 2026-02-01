import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { PingHandler } from './handlers/meHandlers/PingHandler';
import { HelpHandler } from './handlers/meHandlers/HelpHandler';
import { HelloHandler } from './handlers/meHandlers/HelloHandler';
import { StickerHandler } from './handlers/meHandlers/StickerHandler';
import { PdfHandler } from './handlers/meHandlers/PdfHandler';
import { WeatherHandler } from './handlers/meHandlers/WeatherHandler';
import { TodoHandler } from './handlers/meHandlers/TodoHandler';
import { NewsHandler } from './handlers/meHandlers/NewsHandler';
import { JokeHandler } from './handlers/meHandlers/JokeHandler';
import { SummarizeHandler } from './handlers/meHandlers/SummarizeHandler';
import { TranslateHandler } from './handlers/meHandlers/TranslateHandler';
import { QuoteHandler } from './handlers/meHandlers/QuoteHandler';
import { CryptoHandler } from './handlers/meHandlers/CryptoHandler';
import { ProxyHandler } from './handlers/ProxyHandler';
import FromMeHandler from './handlers/meHandlers/FromMeHandler';
import MentionedMeHandler from './handlers/otherPeopleHandlers/MentionedMeHandler';
import { AIResponseHandler } from './handlers/otherPeopleHandlers/AIResponseHandler';
import dotEnv from 'dotenv';
dotEnv.config();

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session' // carpeta donde se guardan los datos
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr: string) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
    console.log(qrcode.generate(qr, { small: true }));
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// 1. Creamos la cadena de responsabilidad
// Me hanlders

const apiKey = process.env.API_KEY as string;
const fromMeHandler = new FromMeHandler();
const messageChain = new PingHandler();
messageChain.setNext(new HelpHandler())
    .setNext(new HelloHandler())
    .setNext(new StickerHandler())
    .setNext(new PdfHandler())
    .setNext(new WeatherHandler())
    .setNext(new TodoHandler())
    .setNext(new NewsHandler())
    .setNext(new JokeHandler())
    .setNext(new SummarizeHandler(apiKey))
    .setNext(new TranslateHandler(apiKey))
    .setNext(new QuoteHandler())
    .setNext(new CryptoHandler());

fromMeHandler.setNext(messageChain)

// Group handlers
const mentionedMeHandler = new MentionedMeHandler();
mentionedMeHandler.setNext(new HelpHandler());

// Other people handlers
const otherPeopleChain = new AIResponseHandler(process.env.API_KEY as string);
const otherPeoplePingHandler = new PingHandler();
otherPeoplePingHandler.setNext(new HelpHandler());
otherPeopleChain.setNext(otherPeoplePingHandler);


const proxy = new ProxyHandler(
    fromMeHandler,
    // Handlers para mensajes de otros contactos
    otherPeopleChain,
    mentionedMeHandler
);
const handleMessage = (msg: Message) => {
    console.log('MESSAGE DETAILS', { from: msg.from, to: msg.to, body: msg.body, fromMe: msg.fromMe });
    // Inicia el procesamiento en el primer eslabón de la cadena
    proxy.handle(msg, client);
};

// Evento para mensajes de OTROS contactos
client.on('message', (msg: Message) => {
    // Revisa que el mensaje no sea de un estado (status@broadcast)
    if (msg.from.includes('@broadcast')) {
        return;
    }
    handleMessage(msg);
});

// Evento para TUS PROPIOS mensajes (comandos personales)
client.on('message_create', (msg: Message) => {
    // Filtra para que solo procese los mensajes que tú envías
    if (msg.fromMe) {
        handleMessage(msg);
    }
});

client.initialize();
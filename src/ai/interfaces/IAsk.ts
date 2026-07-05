    import { ChatMessage } from "../../database.js";

    interface IAsk {
        ask(chatMessage: ChatMessage[], systemInstructions: string): Promise<string | null>;
    }

    export default IAsk;
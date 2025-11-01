import { ChatMessage } from "../../database.js";
import IAsk from "./IAsk.js";

abstract class AI implements IAsk {
    // --- Configuración base ---
    private _temperature = 0.7;
    private _maxTokens = 1024;
    private _model = "default-model";
    private _apiKey: string | undefined;
    constructor(
        model?: string,
        temperature?: number,
        maxTokens?: number,
        apiKey?: string
    ) {
        if (model) this._model = model;
        if (temperature !== undefined) this._temperature = temperature;
        if (maxTokens !== undefined) this._maxTokens = maxTokens;
        if (apiKey) this._apiKey = apiKey;
    }
    // --- Getters y setters ---
    get temperature(): number { return this._temperature; }
    set temperature(value: number) { this._temperature = value; }

    get maxTokens(): number { return this._maxTokens; }
    set maxTokens(value: number) { this._maxTokens = value; }

    get model(): string { return this._model; }
    set model(value: string) { this._model = value; }
    protected get apiKey(): string | undefined { return this._apiKey; } 

    // --- Método abstracto principal ---
    abstract ask(chatMessage: ChatMessage[], systemInstructions: string): Promise<string | null>;
}
export default AI;

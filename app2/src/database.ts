
import Database from 'better-sqlite3';

// Define the structure of a message for our history, compatible with GoogleGenAI
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export class DatabaseService {
    private db;

    constructor(dbPath: string = 'chat_history.db') {
        this.db = new Database(dbPath);
        this.init();
    }

    private init(): void {
        // Create messages table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                ai_enabled INTEGER DEFAULT 1,
                can_toggle_ai INTEGER DEFAULT 0
            )
        `);
    }

    // --- User Management Methods ---

    public addUser(userId: string, canToggle: boolean): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO users (user_id, can_toggle_ai, ai_enabled) VALUES (?, ?, 1)
        `);
        stmt.run(userId, canToggle ? 1 : 0);
    }

    public removeUser(userId: string): void {
        const stmt = this.db.prepare('DELETE FROM users WHERE user_id = ?');
        stmt.run(userId);
    }

    public isAiEnabled(userId: string): boolean {
        const stmt = this.db.prepare('SELECT ai_enabled FROM users WHERE user_id = ?');
        const user = stmt.get(userId) as { ai_enabled: number };
        return user ? user.ai_enabled === 1 : false;
    }

    public canUserToggleAi(userId: string): boolean {
        const stmt = this.db.prepare('SELECT can_toggle_ai FROM users WHERE user_id = ?');
        const user = stmt.get(userId) as { can_toggle_ai: number };
        return user ? user.can_toggle_ai === 1 : false;
    }

    public setUserAiStatus(userId: string, isEnabled: boolean): void {
        const stmt = this.db.prepare('UPDATE users SET ai_enabled = ? WHERE user_id = ?');
        stmt.run(isEnabled ? 1 : 0, userId);
    }

    public userExists(userId: string): boolean {
        const stmt = this.db.prepare('SELECT 1 FROM users WHERE user_id = ?');
        return !!stmt.get(userId);
    }

    // --- Chat History Methods ---

    public addMessage(userId: string, role: 'user' | 'model', content: string): void {
        const stmt = this.db.prepare(`
            INSERT INTO messages (user_id, role, content) VALUES (?, ?, ?)
        `);
        stmt.run(userId, role, content);
        this.trimHistory(userId);
    }

    public getHistory(userId: string, limit: number = 10): ChatMessage[] {
        const stmt = this.db.prepare(`
            SELECT role, content FROM messages
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        const rows = stmt.all(userId, limit) as { role: 'user' | 'model'; content: string }[];
        
        return rows.reverse().map(row => ({
            role: row.role,
            parts: [{ text: row.content }]
        }));
    }

    private trimHistory(userId: string, keep: number = 10): void {
        this.db.exec(`
            DELETE FROM messages
            WHERE user_id = '${userId}' AND id NOT IN (
                SELECT id FROM messages
                WHERE user_id = '${userId}'
                ORDER BY timestamp DESC
                LIMIT ${keep}
            )
        `);
    }

    public close(): void {
        this.db.close();
    }
}

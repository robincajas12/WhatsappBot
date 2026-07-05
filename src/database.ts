import mongoose, { Schema, Document } from 'mongoose';

// Define the structure of a message for our history, compatible with GoogleGenAI
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

// --- Mongoose Interfaces ---

interface IUser extends Document {
    userId: string;
    ai_enabled: boolean;
    can_toggle_ai: boolean;
}

interface IMessage extends Document {
    userId: string;
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
}

// --- Mongoose Schemas ---

const UserSchema: Schema = new Schema({
    userId: { type: String, required: true, unique: true },
    ai_enabled: { type: Boolean, default: true },
    can_toggle_ai: { type: Boolean, default: false },
});

const MessageSchema: Schema = new Schema({
    userId: { type: String, required: true },
    role: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

// --- Mongoose Models ---

const UserModel = mongoose.model<IUser>('User', UserSchema);
const MessageModel = mongoose.model<IMessage>('Message', MessageSchema);

export class DatabaseService {
    constructor() {
        this.connect();
    }

    private async connect(): Promise<void> {
        if (mongoose.connection.readyState === 1) {
            console.log('Already connected to MongoDB');
            return;
        }

        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('MONGODB_URI is not defined in environment variables.');
            return;
        }

        try {
            await mongoose.connect(mongoUri);
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
        }
    }

    // --- User Management Methods ---

    public async addUser(userId: string, canToggle: boolean): Promise<void> {
        await UserModel.findOneAndUpdate(
            { userId: userId },
            { userId: userId, can_toggle_ai: canToggle, ai_enabled: true },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    public async removeUser(userId: string): Promise<void> {
        await UserModel.deleteOne({ userId: userId });
    }

    public async isAiEnabled(userId: string): Promise<boolean> {
        const user = await UserModel.findOne({ userId: userId });
        return user ? user.ai_enabled : false;
    }

    public async canUserToggleAi(userId: string): Promise<boolean> {
        const user = await UserModel.findOne({ userId: userId });
        return user ? user.can_toggle_ai : false;
    }

    public async setUserAiStatus(userId: string, isEnabled: boolean): Promise<void> {
        await UserModel.updateOne({ userId: userId }, { ai_enabled: isEnabled });
    }

    public async userExists(userId: string): Promise<boolean> {
        const user = await UserModel.findOne({ userId: userId });
        return !!user;
    }

    // --- Chat History Methods ---

    public async addMessage(userId: string, role: 'user' | 'model', content: string): Promise<void> {
        await MessageModel.create({ userId, role, content });
        await this.trimHistory(userId);
    }

    public async getHistory(userId: string, limit: number = 10): Promise<ChatMessage[]> {
        const messages = await MessageModel.find({ userId: userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean(); // Use .lean() for plain JavaScript objects

        return messages.reverse().map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));
    }

    private async trimHistory(userId: string, keep: number = 10): Promise<void> {
        const messageCount = await MessageModel.countDocuments({ userId: userId });
        if (messageCount > keep) {
            const messagesToDelete = await MessageModel.find({ userId: userId })
                .sort({ timestamp: 1 })
                .limit(messageCount - keep);
            
            const idsToDelete = messagesToDelete.map(msg => msg._id);
            await MessageModel.deleteMany({ _id: { $in: idsToDelete } });
        }
    }

    public async close(): Promise<void> {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}
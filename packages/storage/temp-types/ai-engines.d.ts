import { type LocalDatabase } from './database';
import { type CredentialManager } from './credentials';
import { type AiEngine, type NewAiEngine } from './schema';
export declare class AIEnginesRepository {
    private db;
    private credentialManager;
    constructor(db: LocalDatabase, credentialManager: CredentialManager);
    create(engine: Omit<NewAiEngine, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiEngine>;
    findAll(): Promise<AiEngine[]>;
    findById(id: string): Promise<AiEngine | undefined>;
    update(id: string, updates: Partial<Omit<AiEngine, 'id' | 'createdAt'>>): Promise<AiEngine | undefined>;
    delete(id: string): Promise<void>;
    validateEngine(engine: AiEngine): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    testConnection(engineId: string): Promise<{
        success: boolean;
        latency?: number;
        error?: string;
    }>;
}

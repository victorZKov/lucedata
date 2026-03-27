import { eq } from "drizzle-orm";

import { type LocalDatabase } from "./database";
import { type CredentialManager } from "./credentials";
import { aiEngines, type AiEngine, type NewAiEngine } from "./schema";

export class AIEnginesRepository {
  constructor(
    private db: LocalDatabase,
    private credentialManager: CredentialManager
  ) {}

  async create(
    engine: Omit<NewAiEngine, "id" | "createdAt" | "updatedAt">
  ): Promise<AiEngine> {
    const id = crypto.randomUUID();

    const newEngine: NewAiEngine = {
      ...engine,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const [created] = await this.db.db
      .insert(aiEngines)
      .values(newEngine)
      .returning();

    return created;
  }

  async findAll(): Promise<AiEngine[]> {
    return this.db.db.select().from(aiEngines).all();
  }

  async findById(id: string): Promise<AiEngine | undefined> {
    const [engine] = await this.db.db
      .select()
      .from(aiEngines)
      .where(eq(aiEngines.id, id))
      .limit(1);

    return engine;
  }

  async update(
    id: string,
    updates: Partial<Omit<AiEngine, "id" | "createdAt">>
  ): Promise<AiEngine | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const [updated] = await this.db.db
      .update(aiEngines)
      .set(updateData)
      .where(eq(aiEngines.id, id))
      .returning();

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.db.delete(aiEngines).where(eq(aiEngines.id, id));
  }

  async validateEngine(
    engine: AiEngine
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!engine.name?.trim()) {
      errors.push("Engine name is required");
    }

    if (!engine.provider) {
      errors.push("Provider is required");
    }

    // Endpoint requirements
    if (engine.provider === "custom" && !engine.endpoint) {
      errors.push("Custom providers require an endpoint URL");
    }
    if (engine.provider === "azure-openai" && !engine.endpoint) {
      errors.push("Azure OpenAI requires a resource endpoint URL");
    }
    if (
      engine.provider === "ollama" &&
      engine.endpoint &&
      !/^https?:\/\//.test(engine.endpoint)
    ) {
      errors.push(
        "Ollama endpoint must be a valid URL (e.g. http://localhost:11434)"
      );
    }

    // API key requirements (all except Ollama currently; custom also requires unless explicitly handled differently)
    const providerRequiresKey = !["ollama"].includes(engine.provider);
    if (providerRequiresKey) {
      if (!engine.apiKeyRef) {
        errors.push("API key is required for this provider");
      } else {
        try {
          const hasKey = await this.credentialManager.hasApiKey(
            engine.apiKeyRef
          );
          if (!hasKey) {
            errors.push("Stored API key not found (re-enter it)");
          }
        } catch (_error) {
          errors.push("Failed to verify stored API key");
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async testConnection(
    engineId: string
  ): Promise<{ success: boolean; latency?: number; error?: string }> {
    const engine = await this.findById(engineId);
    if (!engine) {
      return { success: false, error: "Engine not found" };
    }

    try {
      const startTime = Date.now();

      // For now, just validate the configuration
      const validation = await this.validateEngine(engine);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(", ") };
      }

      const latency = Date.now() - startTime;
      return { success: true, latency };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

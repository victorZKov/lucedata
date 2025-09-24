import type { DatabaseType } from '@sqlhelper/database-core';

import { 
  IAIProvider, 
  AIProvider, 
  AIEngineConfig, 
  SQLContext,
  ChatMessage 
} from './types.js';
import { OpenAIProvider } from './providers/openai-enhanced.js';

export class AIManager {
  private providers = new Map<string, IAIProvider>();
  private currentProvider: IAIProvider | null = null;

  constructor() {
    // MCP tools will be added later when ready
  }

  async configureProvider(config: AIEngineConfig): Promise<void> {
    const providerId = `${config.provider}-${Date.now()}`;
    
    let provider: IAIProvider;
    
    switch (config.provider) {
      case AIProvider.OpenAI:
        provider = new OpenAIProvider(config);
        break;
        
      case AIProvider.Anthropic:
        // TODO: Implement Anthropic provider
        throw new Error('Anthropic provider not yet implemented');
        
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
    
    this.providers.set(providerId, provider);
    this.currentProvider = provider;
  }

  getCurrentProvider(): IAIProvider | null {
    return this.currentProvider;
  }

  getProvider(providerId: string): IAIProvider | undefined {
    return this.providers.get(providerId);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async switchProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    this.currentProvider = provider;
  }

  async removeProvider(providerId: string): Promise<void> {
    const removed = this.providers.delete(providerId);
    if (!removed) {
      throw new Error(`Provider '${providerId}' not found`);
    }
    
    // If we removed the current provider, clear it
    if (this.currentProvider === this.providers.get(providerId)) {
      this.currentProvider = null;
    }
  }

  // Convenience methods that delegate to the current provider
  async generateSQL(prompt: string, context: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    const messages = [
      {
        role: 'system' as const,
        content: `You are a SQL assistant. Generate SQL queries based on user requests.
Database: ${context.databaseType}
Available tables: ${context.tables.map(t => t.name).join(', ')}`,
        context
      },
      { role: 'user' as const, content: prompt }
    ];
    return this.currentProvider.generate(messages);
  }

  async chat(messages: ChatMessage[], context?: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    
    // Add context to the first system message if available
    const enrichedMessages = [...messages];
    if (context && enrichedMessages.length > 0 && enrichedMessages[0].role === 'system') {
      enrichedMessages[0] = { ...enrichedMessages[0], context };
    }
    
    return this.currentProvider.generate(enrichedMessages, { stream: false });
  }

  async generateStream(messages: ChatMessage[], context?: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    
    // Add context to the first system message if available
    const enrichedMessages = [...messages];
    if (context && enrichedMessages.length > 0 && enrichedMessages[0].role === 'system') {
      enrichedMessages[0] = { ...enrichedMessages[0], context };
    }
    
    return this.currentProvider.generateStream(enrichedMessages);
  }

  // MCP Tools integration (placeholder - to be implemented)
  getToolRegistry() {
    throw new Error('MCP tools not yet implemented');
  }

  async executeTool(_toolName: string, _args: Record<string, unknown>, _context: SQLContext) {
    throw new Error('MCP tools not yet implemented');
  }

  listTools() {
    return [];
  }
}
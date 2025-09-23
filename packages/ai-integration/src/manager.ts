import { 
  IAIProvider, 
  AIProvider, 
  AIConfig, 
  SQLContext 
} from './types.js';
import type { DatabaseType } from '@sqlhelper/database-core';
import { OpenAIProvider } from './providers/openai.js';
import { MCPToolRegistryImpl, createBuiltinTools } from './mcp/tools.js';

export class AIManager {
  private providers = new Map<string, IAIProvider>();
  private currentProvider: IAIProvider | null = null;
  private toolRegistry = new MCPToolRegistryImpl();

  constructor() {
    // Register built-in MCP tools
    const builtinTools = createBuiltinTools();
    builtinTools.forEach(tool => this.toolRegistry.registerTool(tool));
  }

  async configureProvider(config: AIConfig): Promise<void> {
    const providerId = `${config.provider}-${Date.now()}`;
    
    let provider: IAIProvider;
    
    switch (config.provider) {
      case AIProvider.OpenAI:
        provider = new OpenAIProvider({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model
        });
        break;
        
      case AIProvider.Anthropic:
        // TODO: Implement Anthropic provider
        throw new Error('Anthropic provider not yet implemented');
        
      case AIProvider.Azure:
        // TODO: Implement Azure provider  
        throw new Error('Azure provider not yet implemented');
        
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
    return this.currentProvider.generateSQL(prompt, context);
  }

  async explainQuery(query: string, context: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    return this.currentProvider.explainQuery(query, context);
  }

  async analyzeSchema(schema: any, databaseType: DatabaseType) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    return this.currentProvider.analyzeSchema(schema, databaseType);
  }

  async chat(messages: any[], context?: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    return this.currentProvider.chat(messages, context);
  }

  async optimizeQuery(query: string, context: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    return this.currentProvider.optimizeQuery(query, context);
  }

  async validateSQL(query: string, context: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    return this.currentProvider.validateSQL(query, context);
  }

  async generateDocumentation(query: string, context: SQLContext) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }
    return this.currentProvider.generateDocumentation(query, context);
  }

  // MCP Tools integration
  getToolRegistry() {
    return this.toolRegistry;
  }

  async executeTool(toolName: string, args: any, context: SQLContext) {
    return this.toolRegistry.executeTool(toolName, args, context);
  }

  listTools() {
    return this.toolRegistry.listTools();
  }
}
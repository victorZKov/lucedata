import { z } from 'zod';
import type { SchemaInfo, TableInfo, DatabaseType } from '@sqlhelper/database-core';

// Updated AI Provider types to match prompt requirements
export enum AIProvider {
  OpenAI = 'openai',
  AzureOpenAI = 'azure-openai', 
  Anthropic = 'anthropic',
  Google = 'google',
  Ollama = 'ollama',
  Custom = 'custom'
}

export interface AIEngineConfig {
  id?: string;
  name: string;
  provider: AIProvider;
  endpoint?: string;
  apiKey?: string;
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  retryPolicy?: 'exponential' | 'linear' | 'none';
  jsonMode?: boolean;
  rateLimit?: number;
  notes?: string;
  isDefault?: boolean;
}

// Legacy config for backward compatibility
export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// MCP Tool Call structures
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  toolCallId: string;
  result: Record<string, unknown> | string | number | boolean | null;
  error?: string;
}

// Chat message structures for AI engines
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string; // For tool result messages
  timestamp?: Date;
  context?: SQLContext;
}

export interface StreamingChatResponse {
  content?: string;
  toolCalls?: ToolCall[];
  done?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

// Enhanced AI Provider interface for the new system
export interface IAIProvider {
  readonly provider: AIProvider;
  readonly config: AIEngineConfig;
  
  // Core generation methods
  generate(
    messages: ChatMessage[], 
    options?: GenerateOptions
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }>;
  
  generateStream(
    messages: ChatMessage[], 
    options?: GenerateOptions
  ): AsyncIterable<StreamingChatResponse>;
  
  // Configuration and validation
  validateConfig(): Promise<{ valid: boolean; errors: string[] }>;
  testConnection(): Promise<{ success: boolean; latency?: number; error?: string }>;
  
  // Model management (optional for providers that support it)
  listModels?(): Promise<string[]>;
  
  // Provider-specific capabilities
  supportsStreaming(): boolean;
  supportsTools(): boolean;
  supportsJsonMode(): boolean;
}

// SQL Generation context
export interface SQLContext {
  databaseType: DatabaseType;
  schema: SchemaInfo;
  tables: TableInfo[];
  currentTable?: string;
  recentQueries?: string[];
}

// Legacy interfaces for backward compatibility
export interface QueryExplanation {
  summary: string;
  stepByStep: string[];
  performance: {
    complexity: 'low' | 'medium' | 'high';
    estimatedRows: number;
    suggestedIndexes?: string[];
    optimizations?: string[];
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    warnings: string[];
    recommendations: string[];
  };
}

export interface SQLGenerationResult {
  query: string;
  explanation: string;
  confidence: number;
  alternatives?: string[];
  warnings?: string[];
}

export interface SchemaAnalysis {
  summary: string;
  tableDescriptions: Record<string, string>;
  relationships: {
    from: string;
    to: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    description: string;
  }[];
  suggestedQueries: {
    description: string;
    query: string;
    useCase: string;
  }[];
}

export interface ChatResponse {
  message: string;
  query?: string;
  explanation?: string;
  followUpQuestions?: string[];
}

// MCP (Model Context Protocol) tool definitions
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: SQLContext) => Promise<Record<string, unknown>>;
}

export interface MCPToolRegistry {
  registerTool(tool: MCPTool): void;
  getTool(name: string): MCPTool | undefined;
  listTools(): MCPTool[];
  executeTool(name: string, args: Record<string, unknown>, context: SQLContext): Promise<Record<string, unknown>>;
}

// Validation schemas using Zod
export const AIEngineConfigSchema = z.object({
  name: z.string().min(1),
  provider: z.nativeEnum(AIProvider),
  endpoint: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  defaultModel: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
  timeoutMs: z.number().min(1000).optional(),
  retryPolicy: z.enum(['exponential', 'linear', 'none']).optional(),
  jsonMode: z.boolean().optional(),
  rateLimit: z.number().min(1).optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().optional()
});

export const AIConfigSchema = z.object({
  provider: z.nativeEnum(AIProvider),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
  timeout: z.number().min(1000).optional()
});

export const SQLContextSchema = z.object({
  databaseType: z.string(),
  schema: z.object({
    tables: z.array(z.any()),
    views: z.array(z.any()),
    procedures: z.array(z.any()),
    functions: z.array(z.any())
  }),
  tables: z.array(z.any()),
  currentTable: z.string().optional(),
  recentQueries: z.array(z.string()).optional()
});

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  toolCallId: z.string().optional(),
  timestamp: z.date().optional(),
  context: SQLContextSchema.optional()
});
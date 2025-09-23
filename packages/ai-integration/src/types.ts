import { z } from 'zod';
import type { SchemaInfo, TableInfo, ColumnInfo, DatabaseType } from '@sqlhelper/database-core';

// AI Provider types
export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Azure = 'azure'
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

// SQL Generation context
export interface SQLContext {
  databaseType: DatabaseType;
  schema: SchemaInfo;
  tables: TableInfo[];
  currentTable?: string;
  recentQueries?: string[];
}

// Query explanation types
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

// SQL generation results
export interface SQLGenerationResult {
  query: string;
  explanation: string;
  confidence: number;
  alternatives?: string[];
  warnings?: string[];
}

// Schema analysis
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

// AI chat message types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  context?: SQLContext;
}

export interface ChatResponse {
  message: string;
  query?: string;
  explanation?: string;
  followUpQuestions?: string[];
}

// Validation schemas using Zod
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
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  timestamp: z.date().optional(),
  context: SQLContextSchema.optional()
});

// Base AI provider interface
export interface IAIProvider {
  readonly provider: AIProvider;
  
  // Core methods
  generateSQL(prompt: string, context: SQLContext): Promise<SQLGenerationResult>;
  explainQuery(query: string, context: SQLContext): Promise<QueryExplanation>;
  analyzeSchema(schema: SchemaInfo, databaseType: DatabaseType): Promise<SchemaAnalysis>;
  
  // Chat interface
  chat(messages: ChatMessage[], context?: SQLContext): Promise<ChatResponse>;
  
  // Utility methods
  optimizeQuery(query: string, context: SQLContext): Promise<{
    optimizedQuery: string;
    improvements: string[];
    performanceGain: string;
  }>;
  
  validateSQL(query: string, context: SQLContext): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }>;
  
  generateDocumentation(query: string, context: SQLContext): Promise<{
    description: string;
    parameters: string[];
    usage: string;
    examples: string[];
  }>;
}

// MCP (Model Context Protocol) tool definitions
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any, context: SQLContext) => Promise<any>;
}

export interface MCPToolRegistry {
  registerTool(tool: MCPTool): void;
  getTool(name: string): MCPTool | undefined;
  listTools(): MCPTool[];
  executeTool(name: string, args: any, context: SQLContext): Promise<any>;
}
import OpenAI from 'openai';
import { 
  IAIProvider, 
  AIProvider, 
  SQLContext, 
  SQLGenerationResult, 
  QueryExplanation, 
  SchemaAnalysis, 
  ChatMessage, 
  ChatResponse 
} from '../types.js';
import { BaseAIProvider } from './base.js';

export class OpenAIProvider extends BaseAIProvider implements IAIProvider {
  readonly provider = AIProvider.OpenAI;
  private client: OpenAI;
  private model: string;

  constructor(config: { apiKey: string; baseUrl?: string; model?: string }) {
    super();
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1'
    });
    this.model = config.model || 'gpt-4.1-mini';
  }

  async generateSQL(prompt: string, context: SQLContext): Promise<SQLGenerationResult> {
    const systemPrompt = this.buildSQLSystemPrompt(context);
    const userPrompt = this.buildSQLUserPrompt(prompt, context);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseSQLResponse(content);
    } catch (error) {
      throw new Error(`SQL generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async explainQuery(query: string, context: SQLContext): Promise<QueryExplanation> {
    const systemPrompt = `You are an expert SQL analyst. Explain SQL queries in detail, analyze performance implications, and assess risks.

Database type: ${context.databaseType}
Available tables: ${context.tables.map(t => t.name).join(', ')}

Provide your response in the following JSON format:
{
  "summary": "Brief explanation of what the query does",
  "stepByStep": ["Step 1", "Step 2", ...],
  "performance": {
    "complexity": "low|medium|high",
    "estimatedRows": number,
    "suggestedIndexes": ["index1", "index2"],
    "optimizations": ["optimization1", "optimization2"]
  },
  "riskAssessment": {
    "level": "low|medium|high", 
    "warnings": ["warning1", "warning2"],
    "recommendations": ["rec1", "rec2"]
  }
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Explain this SQL query:\n\n${query}` }
        ],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '';
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Query explanation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeSchema(schema: any, databaseType: string): Promise<SchemaAnalysis> {
    const systemPrompt = `You are a database architect expert. Analyze the provided database schema and provide insights.

Database type: ${databaseType}

Provide your response in the following JSON format:
{
  "summary": "Overall schema description",
  "tableDescriptions": {
    "table1": "Description of table1",
    "table2": "Description of table2"
  },
  "relationships": [
    {
      "from": "table1",
      "to": "table2", 
      "type": "one-to-many",
      "description": "Relationship description"
    }
  ],
  "suggestedQueries": [
    {
      "description": "What this query shows",
      "query": "SELECT ...",
      "useCase": "When to use this query"
    }
  ]
}`;

    const schemaDescription = this.formatSchemaForAnalysis(schema);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this database schema:\n\n${schemaDescription}` }
        ],
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content || '';
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Schema analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async chat(messages: ChatMessage[], context?: SQLContext): Promise<ChatResponse> {
    const systemPrompt = this.buildChatSystemPrompt(context);
    
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        temperature: 0.3,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseChatResponse(content, context);
    } catch (error) {
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async optimizeQuery(query: string, context: SQLContext): Promise<{
    optimizedQuery: string;
    improvements: string[];
    performanceGain: string;
  }> {
    const systemPrompt = `You are a SQL performance expert. Optimize the given SQL query for better performance.

Database type: ${context.databaseType}
Available tables: ${context.tables.map(t => t.name).join(', ')}

Provide your response in JSON format:
{
  "optimizedQuery": "The optimized SQL query",
  "improvements": ["List of improvements made"],
  "performanceGain": "Expected performance improvement description"
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Optimize this SQL query:\n\n${query}` }
        ],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '';
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Query optimization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async validateSQL(query: string, context: SQLContext): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }> {
    const systemPrompt = `You are a SQL validator. Check the given SQL query for syntax errors, logical issues, and provide suggestions.

Database type: ${context.databaseType}
Available tables: ${context.tables.map(t => t.name).join(', ')}

Provide your response in JSON format:
{
  "isValid": boolean,
  "errors": ["List of errors found"],
  "suggestions": ["List of suggestions for improvement"]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Validate this SQL query:\n\n${query}` }
        ],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content || '';
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`SQL validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateDocumentation(query: string, context: SQLContext): Promise<{
    description: string;
    parameters: string[];
    usage: string;
    examples: string[];
  }> {
    const systemPrompt = `You are a technical documentation expert. Generate comprehensive documentation for the given SQL query.

Database type: ${context.databaseType}
Available tables: ${context.tables.map(t => t.name).join(', ')}

Provide your response in JSON format:
{
  "description": "Detailed description of what the query does",
  "parameters": ["List of parameters or inputs the query expects"],
  "usage": "How and when to use this query",
  "examples": ["Example variations of the query"]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate documentation for this SQL query:\n\n${query}` }
        ],
        temperature: 0.2
      });

      const content = response.choices[0]?.message?.content || '';
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Documentation generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
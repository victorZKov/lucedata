import type {
  IAIProvider,
  ChatMessage,
  ToolCall,
  ToolResult,
  SQLContext,
  MCPToolRegistry,
} from "./types.js";

export interface AgentConfig {
  provider: IAIProvider;
  toolRegistry: MCPToolRegistry;
  enforceContract?: boolean; // Whether to enforce single SQL output
  systemPrompt?: string;
}

export interface AgentResponse {
  messages: ChatMessage[];
  finalSQL?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

export class SQLAssistantAgent {
  private config: AgentConfig;
  private readonly defaultSystemPrompt = `You are an SQL assistant for a desktop database tool.

IMPORTANT RULES:
1. Use available tools to inspect schema and sample data before writing queries
2. Never execute write operations (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP)
3. When asked for a query, output exactly one SQL statement in a fenced code block
4. For SQL Server databases, use T-SQL syntax
5. If the request is ambiguous, ask clarifying questions
6. Your final response must contain exactly one SQL query in a code block

Available tools can help you:
- Describe table schemas
- Find tables by name patterns  
- Sample data from tables
- Analyze query patterns

Always use tools first to understand the database structure before writing SQL.`;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async processChat(
    messages: ChatMessage[],
    context: SQLContext
  ): Promise<AgentResponse> {
    const conversationMessages = [...messages];

    // Add system prompt if not present
    if (
      conversationMessages.length === 0 ||
      conversationMessages[0].role !== "system"
    ) {
      conversationMessages.unshift({
        role: "system",
        content: this.config.systemPrompt || this.defaultSystemPrompt,
        context,
      });
    }

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let totalCost = 0;
    let maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      // Generate response with tools
      const tools = this.buildToolsDefinition();
      const response = await this.config.provider.generate(
        conversationMessages,
        {
          tools: tools.length > 0 ? tools : undefined,
        }
      );

      // Update usage tracking
      if (response.usage) {
        totalUsage.promptTokens += response.usage.promptTokens;
        totalUsage.completionTokens += response.usage.completionTokens;
        totalUsage.totalTokens += response.usage.totalTokens;
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
        timestamp: new Date(),
      };
      conversationMessages.push(assistantMessage);

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        break;
      }

      // Execute tool calls
      const toolResults = await this.executeToolCalls(
        response.toolCalls,
        context
      );

      // Add tool result messages
      for (const result of toolResults) {
        conversationMessages.push({
          role: "tool",
          content: result.error || JSON.stringify(result.result),
          toolCallId: result.toolCallId,
          timestamp: new Date(),
        });
      }
    }

    // Extract final SQL if contract enforcement is enabled
    let finalSQL: string | undefined;
    if (this.config.enforceContract !== false) {
      finalSQL = this.extractSQL(conversationMessages);

      if (!finalSQL && this.isQueryRequest(messages)) {
        throw new Error(
          "Agent failed to produce required SQL query. Please try rephrasing your request."
        );
      }
    }

    return {
      messages: conversationMessages,
      finalSQL,
      usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
      cost: totalCost > 0 ? totalCost : undefined,
    };
  }

  async processStreamingChat(
    messages: ChatMessage[],
    context: SQLContext,
    onChunk: (chunk: { content?: string; done?: boolean }) => void
  ): Promise<AgentResponse> {
    const conversationMessages = [...messages];

    // Add system prompt if not present
    if (
      conversationMessages.length === 0 ||
      conversationMessages[0].role !== "system"
    ) {
      conversationMessages.unshift({
        role: "system",
        content: this.config.systemPrompt || this.defaultSystemPrompt,
        context,
      });
    }

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const tools = this.buildToolsDefinition();
      let content = "";
      let toolCalls: ToolCall[] = [];

      // Stream the response
      const stream = this.config.provider.generateStream(conversationMessages, {
        tools: tools.length > 0 ? tools : undefined,
      });

      for await (const chunk of stream) {
        if (chunk.content) {
          content += chunk.content;
          onChunk({ content: chunk.content });
        }

        if (chunk.toolCalls) {
          toolCalls = chunk.toolCalls;
        }

        if (chunk.done) {
          if (chunk.usage) {
            totalUsage.promptTokens += chunk.usage.promptTokens;
            totalUsage.completionTokens += chunk.usage.completionTokens;
            totalUsage.totalTokens += chunk.usage.totalTokens;
          }
          onChunk({ done: true });
          break;
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        timestamp: new Date(),
      };
      conversationMessages.push(assistantMessage);

      // If no tool calls, we're done
      if (!toolCalls || toolCalls.length === 0) {
        break;
      }

      // Execute tool calls
      const toolResults = await this.executeToolCalls(toolCalls, context);

      // Add tool result messages
      for (const result of toolResults) {
        conversationMessages.push({
          role: "tool",
          content: result.error || JSON.stringify(result.result),
          toolCallId: result.toolCallId,
          timestamp: new Date(),
        });
      }
    }

    // Extract final SQL
    let finalSQL: string | undefined;
    if (this.config.enforceContract !== false) {
      finalSQL = this.extractSQL(conversationMessages);

      if (!finalSQL && this.isQueryRequest(messages)) {
        throw new Error(
          "Agent failed to produce required SQL query. Please try rephrasing your request."
        );
      }
    }

    return {
      messages: conversationMessages,
      finalSQL,
      usage: totalUsage.totalTokens > 0 ? totalUsage : undefined,
    };
  }

  private buildToolsDefinition() {
    const tools = this.config.toolRegistry.listTools();
    return tools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private async executeToolCalls(
    toolCalls: ToolCall[],
    context: SQLContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await this.config.toolRegistry.executeTool(
          toolCall.function.name,
          args,
          context
        );

        results.push({
          toolCallId: toolCall.id,
          result,
        });
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          result: {},
          error:
            error instanceof Error ? error.message : "Tool execution failed",
        });
      }
    }

    return results;
  }

  private extractSQL(messages: ChatMessage[]): string | undefined {
    // Look for SQL in assistant messages (reverse order to get the latest)
    const assistantMessages = messages
      .filter(m => m.role === "assistant")
      .reverse();

    for (const message of assistantMessages) {
      // Extract ALL SQL blocks from the message
      const sqlBlocks: string[] = [];
      const sqlRegex = /```sql\n?(.*?)\n?```|```\n?(.*?)\n?```/gs;
      let match;

      while ((match = sqlRegex.exec(message.content)) !== null) {
        const sql = (match[1] || match[2] || "").trim();
        if (this.looksLikeSQL(sql)) {
          sqlBlocks.push(sql);
        }
      }

      if (sqlBlocks.length > 0) {
        // Filter out schema inspection queries and prioritize data queries
        const dataQueries = sqlBlocks.filter(
          sql => !this.isSchemaInspectionQuery(sql)
        );

        // Return first data query, or first query if no data queries found
        return dataQueries.length > 0 ? dataQueries[0] : sqlBlocks[0];
      }
    }

    return undefined;
  }

  private isSchemaInspectionQuery(sql: string): boolean {
    const upperSQL = sql.toUpperCase().trim();

    // Check for common schema inspection patterns
    const schemaPatterns = [
      "INFORMATION_SCHEMA",
      "SYS.TABLES",
      "SYS.COLUMNS",
      "SYS.OBJECTS",
      "SYSOBJECTS",
      "SYSCOLUMNS",
      "TABLE_SCHEMA",
      "TABLE_NAME",
      "COLUMN_NAME",
      "DATA_TYPE",
    ];

    // If query contains schema inspection keywords, it's likely a schema query
    if (schemaPatterns.some(pattern => upperSQL.includes(pattern))) {
      return true;
    }

    // Additional check: if it's selecting metadata columns
    if (
      upperSQL.includes("SELECT") &&
      (upperSQL.includes("COLUMN_NAME") || upperSQL.includes("TABLE_NAME"))
    ) {
      return true;
    }

    return false;
  }

  private looksLikeSQL(text: string): boolean {
    const upperText = text.toUpperCase().trim();
    const sqlKeywords = [
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "CREATE",
      "ALTER",
      "DROP",
      "WITH",
    ];
    return sqlKeywords.some(keyword => upperText.startsWith(keyword));
  }

  private isQueryRequest(messages: ChatMessage[]): boolean {
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return false;

    const lastUserMessage =
      userMessages[userMessages.length - 1].content.toLowerCase();
    const queryIndicators = [
      "query",
      "select",
      "find",
      "get",
      "show",
      "list",
      "retrieve",
      "search",
      "filter",
      "join",
      "count",
      "sum",
      "average",
      "group",
    ];

    return queryIndicators.some(indicator =>
      lastUserMessage.includes(indicator)
    );
  }
}

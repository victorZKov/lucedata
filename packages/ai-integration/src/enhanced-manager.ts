import type { ChatMessage, SQLContext, IAIProvider } from "./types.js";

interface DatabaseProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeQuery(query: string): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getColumns(tableName: string, schema?: string): Promise<any[]>;
  getSchemas(): Promise<string[]>;
}

/**
 * Enhanced AI Manager that can dynamically inspect database schema
 * during conversations to provide more accurate responses
 */
export class EnhancedAIManager {
  private currentProvider: IAIProvider | null = null;
  private dbProvider: DatabaseProvider | null = null;
  private connectionId: string | null = null;

  setDatabaseProvider(provider: DatabaseProvider, connectionId: string) {
    this.dbProvider = provider;
    this.connectionId = connectionId;
  }

  setAIProvider(provider: IAIProvider) {
    this.currentProvider = provider;
  }

  async chat(
    messages: ChatMessage[],
    context?: SQLContext
  ): Promise<{
    content: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolCalls?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usage?: any;
  }> {
    if (!this.currentProvider) {
      throw new Error("No AI provider configured");
    }

    // Enhance the system message with dynamic schema inspection capabilities
    const enhancedMessages = await this.enhanceMessagesWithDynamicSchema(
      messages,
      context
    );

    return this.currentProvider.generate(enhancedMessages, { stream: false });
  }

  private async enhanceMessagesWithDynamicSchema(
    messages: ChatMessage[],
    context?: SQLContext
  ): Promise<ChatMessage[]> {
    if (!this.dbProvider || !context) {
      console.log("🔍 Enhanced manager: No db provider or context available");
      return messages;
    }

    // Check if the user is asking about specific tables that we should inspect
    const userMessage =
      messages.find(msg => msg.role === "user")?.content || "";
    const mentionedTables = this.extractTableNames(userMessage, context);

    console.log(
      "🔍 Enhanced manager: Processing user message:",
      userMessage.substring(0, 100) + "..."
    );
    console.log(
      "🔍 Enhanced manager: Available tables:",
      context.tables?.map(t => `${t.schema}.${t.name}`)
    );
    console.log("🔍 Enhanced manager: Mentioned tables:", mentionedTables);

    let schemaDetails = "";

    // If tables are mentioned, try to get their column information
    if (mentionedTables.length > 0) {
      console.log("🔍 Dynamically inspecting tables:", mentionedTables);

      for (const tableName of mentionedTables) {
        try {
          const [schema, table] = tableName.includes(".")
            ? tableName.split(".")
            : ["dbo", tableName];

          const columns = await this.dbProvider.getColumns(table, schema);

          if (columns && columns.length > 0) {
            schemaDetails += `\n\nTable ${schema}.${table} columns:\n`;
            columns.forEach(col => {
              schemaDetails += `- ${col.name} (${col.dataType}${col.nullable ? ", nullable" : ", not null"}${col.isPrimaryKey ? ", primary key" : ""})\n`;
            });
          }
        } catch (error) {
          console.warn(`⚠️ Could not inspect table ${tableName}:`, error);
        }
      }
    }

    // If we couldn't find specific tables mentioned, but user seems to be asking about schema
    const isSchemaInquiry = this.isSchemaInquiry(userMessage);
    console.log(
      "🔍 Enhanced manager: Schema inquiry detected:",
      isSchemaInquiry
    );

    if (schemaDetails === "" && isSchemaInquiry) {
      console.log("🔍 User asking about schema, attempting general inspection");

      // Try to inspect common table patterns from the user's question
      const potentialTables = this.guessPotentialTables(userMessage, context);

      for (const tableName of potentialTables) {
        try {
          const [schema, table] = tableName.includes(".")
            ? tableName.split(".")
            : ["dbo", tableName];

          const columns = await this.dbProvider.getColumns(table, schema);

          if (columns && columns.length > 0) {
            schemaDetails += `\n\nTable ${schema}.${table} columns:\n`;
            columns.forEach(col => {
              schemaDetails += `- ${col.name} (${col.dataType}${col.nullable ? ", nullable" : ", not null"}${col.isPrimaryKey ? ", primary key" : ""})\n`;
            });
          }
        } catch (_error) {
          // Silent fail for guessed tables
        }
      }
    }

    // Enhance system message with dynamic schema information
    const systemMessage = messages.find(msg => msg.role === "system");
    if (systemMessage && schemaDetails) {
      const enhancedContent =
        systemMessage.content +
        schemaDetails +
        `

IMPORTANT: You now have detailed column information for the relevant tables. Use this information to:
1. Generate accurate SQL queries with correct column names
2. Understand table relationships based on column names and types  
3. Provide specific insights about the data structure
4. If you need to inspect other tables during the conversation, mention it in your response

Always use the actual column names from the schema details above, not assumed names like 'ShipmentID'.`;

      return messages.map(msg =>
        msg.role === "system" ? { ...msg, content: enhancedContent } : msg
      );
    }

    return messages;
  }

  private extractTableNames(
    userMessage: string,
    context: SQLContext
  ): string[] {
    const tables = context.tables || [];
    const mentioned = [];

    for (const table of tables) {
      const fullName = `${table.schema}.${table.name}`;
      const tableName = table.name.toLowerCase();
      const userLower = userMessage.toLowerCase();

      // Check for explicit table mentions
      if (
        userLower.includes(tableName) ||
        userLower.includes(fullName.toLowerCase())
      ) {
        mentioned.push(fullName);
      }
    }

    return mentioned;
  }

  private guessPotentialTables(
    userMessage: string,
    context: SQLContext
  ): string[] {
    const userLower = userMessage.toLowerCase();
    const tables = context.tables || [];
    const potential = [];

    // Look for keywords that might indicate table relationships
    const keywords = [
      "shipment",
      "line",
      "order",
      "customer",
      "product",
      "invoice",
      "delivery",
    ];

    for (const keyword of keywords) {
      if (userLower.includes(keyword)) {
        const matchingTables = tables.filter(table =>
          table.name.toLowerCase().includes(keyword)
        );

        for (const table of matchingTables) {
          potential.push(`${table.schema}.${table.name}`);
        }
      }
    }

    return potential;
  }

  private isSchemaInquiry(userMessage: string): boolean {
    const schemaKeywords = [
      "field",
      "column",
      "structure",
      "schema",
      "table",
      "without",
      "missing",
      "relationship",
      "join",
      "primary key",
      "foreign key",
      "id",
    ];

    const userLower = userMessage.toLowerCase();
    return schemaKeywords.some(keyword => userLower.includes(keyword));
  }
}

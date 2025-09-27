import type { ChatMessage, SQLContext, IAIProvider } from "./types.js";

interface DatabaseProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executeQuery(query: string): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getColumns(tableName: string, schema?: string): Promise<any[]>;
  getSchemas(): Promise<string[]>;
}

interface QueryExecutionResult {
  query: string;
  result: any;
  error?: string;
}

/**
 * Autonomous AI Manager that can execute database queries independently
 * to inspect schema, analyze data, and provide comprehensive responses
 */
export class AutonomousAIManager {
  private currentProvider: IAIProvider | null = null;
  private dbProvider: DatabaseProvider | null = null;
  private connectionId: string | null = null;
  private executedQueries: QueryExecutionResult[] = [];

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
    executedQueries?: QueryExecutionResult[];
  }> {
    if (!this.currentProvider) {
      throw new Error("No AI provider configured");
    }

    this.executedQueries = [];

    // Create an enhanced system message that includes autonomous capabilities
    const enhancedMessages = await this.createAutonomousContext(
      messages,
      context
    );

    // First, let the AI analyze what it needs to know
    const analysisResponse = await this.currentProvider.generate(
      enhancedMessages,
      { stream: false }
    );

    // Extract any schema inspection queries the AI wants to run
    const inspectionQueries = this.extractInspectionQueries(
      analysisResponse.content || ""
    );

    // Execute inspection queries autonomously
    if (inspectionQueries.length > 0) {
      console.log(
        "🤖 AI requested",
        inspectionQueries.length,
        "autonomous schema inspections"
      );
      await this.executeInspectionQueries(inspectionQueries);

      // Create a new conversation with the inspection results
      return this.generateResponseWithInspectionResults(
        enhancedMessages,
        analysisResponse.content || ""
      );
    }

    // If no inspection needed, return the original response
    return {
      ...analysisResponse,
      executedQueries: this.executedQueries,
    };
  }

  private async createAutonomousContext(
    messages: ChatMessage[],
    context?: SQLContext
  ): Promise<ChatMessage[]> {
    if (!this.dbProvider || !context) {
      return messages;
    }

    // Enhance system message with autonomous capabilities
    const systemMessage = messages.find(msg => msg.role === "system");
    if (!systemMessage) {
      return messages;
    }

    const enhancedSystemContent =
      systemMessage.content +
      `

🤖 AUTONOMOUS DATABASE CAPABILITIES - ALWAYS USE THESE TAGS:
You MUST use these special tags to execute queries automatically. The user expects you to inspect schema and provide complete answers.

📋 REQUIRED WORKFLOW:
1. **ALWAYS start with schema inspection when you don't know table columns**
2. **ALWAYS provide the final query the user is asking for**
3. **Use the exact tags below - they will execute automatically**

🔍 SCHEMA INSPECTION - Use this when you need column names/types:
<INSPECT_SCHEMA>
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Shipments' AND TABLE_SCHEMA = 'dbo';
</INSPECT_SCHEMA>

📊 DATA ANALYSIS - Use to understand data patterns (optional):
<EXECUTE_QUERY>
SELECT TOP 10 * FROM dbo.Shipments 
ORDER BY ShipmentDate DESC;
</EXECUTE_QUERY>

🎯 FINAL RESULT - The main query answering the user's question:
<RESULT_QUERY>
SELECT * FROM dbo.Shipments 
WHERE ShipmentDate >= DATEADD(day, -1, CAST(GETDATE() AS DATE))
AND ShipmentDate < CAST(GETDATE() AS DATE);
</RESULT_QUERY>

🚨 CRITICAL RULES:
- ALWAYS use <INSPECT_SCHEMA> first if you don't know column names
- ALWAYS include <RESULT_QUERY> with the final answer
- These tags execute automatically - don't ask permission
- Provide explanations between the query blocks

Available tables: ${context.tables?.map(t => `${t.schema}.${t.name}`).join(", ")}

EXAMPLE RESPONSE:
"I need to inspect the Shipments table schema first to identify the date column.

<INSPECT_SCHEMA>
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Shipments' AND TABLE_SCHEMA = 'dbo';
</INSPECT_SCHEMA>

Based on the schema, here's the query for yesterday's shipments:

<RESULT_QUERY>
SELECT * FROM dbo.Shipments 
WHERE ShipmentDate >= DATEADD(day, -1, CAST(GETDATE() AS DATE))
AND ShipmentDate < CAST(GETDATE() AS DATE);
</RESULT_QUERY>"

REMEMBER: The user expects autonomous execution - always use the tags!`;

    return messages.map(msg =>
      msg.role === "system" ? { ...msg, content: enhancedSystemContent } : msg
    );
  }

  private extractInspectionQueries(content: string): string[] {
    const queries: string[] = [];

    // Extract schema inspection queries
    const schemaRegex = /<INSPECT_SCHEMA>([\s\S]*?)<\/INSPECT_SCHEMA>/g;
    let match;
    while ((match = schemaRegex.exec(content)) !== null) {
      const query = match[1].trim();
      if (query) {
        queries.push(query);
      }
    }

    // Extract data analysis queries
    const executeRegex = /<EXECUTE_QUERY>([\s\S]*?)<\/EXECUTE_QUERY>/g;
    while ((match = executeRegex.exec(content)) !== null) {
      const query = match[1].trim();
      if (query) {
        queries.push(query);
      }
    }

    // Extract result queries
    const resultRegex = /<RESULT_QUERY>([\s\S]*?)<\/RESULT_QUERY>/g;
    while ((match = resultRegex.exec(content)) !== null) {
      const query = match[1].trim();
      if (query) {
        queries.push(query);
      }
    }

    console.log(
      "🔍 Extracted",
      queries.length,
      "queries from AI response (schema, execute, result)"
    );
    return queries;
  }

  private async executeInspectionQueries(queries: string[]): Promise<void> {
    if (!this.dbProvider) {
      return;
    }

    for (const query of queries) {
      try {
        console.log(
          "🔍 Executing autonomous query:",
          query.substring(0, 100) + "..."
        );
        const result = await this.dbProvider.executeQuery(query);

        this.executedQueries.push({
          query,
          result: {
            rows: result.rows || [],
            rowCount: result.rowCount || 0,
            columns: result.columns || [],
          },
        });

        console.log(
          "✅ Query executed successfully, got",
          result.rowCount || 0,
          "rows"
        );
      } catch (error) {
        console.error("❌ Autonomous query failed:", error);
        this.executedQueries.push({
          query,
          result: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async generateResponseWithInspectionResults(
    originalMessages: ChatMessage[],
    analysisContent: string
  ): Promise<{
    content: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolCalls?: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usage?: any;
    executedQueries: QueryExecutionResult[];
  }> {
    if (!this.currentProvider) {
      throw new Error("No AI provider configured");
    }

    // Create inspection results summary
    let inspectionSummary = "\n\nAUTONOMOUS SCHEMA INSPECTION RESULTS:\n";

    this.executedQueries.forEach((query, index) => {
      inspectionSummary += `\nQuery ${index + 1}: ${query.query.substring(0, 100)}...\n`;

      if (query.error) {
        inspectionSummary += `❌ Error: ${query.error}\n`;
      } else if (query.result && query.result.rows) {
        inspectionSummary += `✅ Results (${query.result.rowCount} rows):\n`;

        // Include first few rows as examples
        query.result.rows.slice(0, 5).forEach((row: any) => {
          inspectionSummary += `  ${JSON.stringify(row)}\n`;
        });

        if (query.result.rowCount > 5) {
          inspectionSummary += `  ... and ${query.result.rowCount - 5} more rows\n`;
        }
      }
    });

    // Add final instruction
    inspectionSummary += `\nBased on this query execution data, provide your final response with:
1. A summary of what you discovered from the queries
2. The final SQL query in a code block using the actual column names  
3. Explanation of the results and insights
4. Do not include any more query execution blocks (<INSPECT_SCHEMA>, <EXECUTE_QUERY>, <RESULT_QUERY>)`;

    // Create new conversation with inspection results
    const enhancedMessages = [
      ...originalMessages,
      {
        role: "assistant" as const,
        content: analysisContent,
      },
      {
        role: "user" as const,
        content: inspectionSummary,
      },
    ];

    // Get final response with schema knowledge
    const finalResponse = await this.currentProvider.generate(
      enhancedMessages,
      { stream: false }
    );

    return {
      ...finalResponse,
      executedQueries: this.executedQueries,
    };
  }
}

import type { 
  SQLContext, 
  SQLGenerationResult, 
  ChatResponse 
} from '../types.js';

export abstract class BaseAIProvider {
  
  protected buildSQLSystemPrompt(context: SQLContext): string {
    const tableList = context.tables.map(table => {
      return `- ${table.name} (${table.schema}): ${table.type}`;
    }).join('\n');

    return `You are an expert SQL developer for ${context.databaseType} databases. 

Available tables and objects:
${tableList}

Guidelines:
- Generate syntactically correct ${context.databaseType} SQL
- Use appropriate table/column names from the provided schema
- Follow SQL best practices for performance and readability
- Include comments for complex logic
- Prefer explicit JOINs over implicit joins
- Use appropriate data types and functions for ${context.databaseType}

Response format:
- Provide the SQL query first
- Follow with a brief explanation
- Include any warnings or considerations
- Suggest alternatives if applicable`;
  }

  protected buildSQLUserPrompt(prompt: string, context: SQLContext): string {
    let userPrompt = prompt;

    if (context.currentTable) {
      userPrompt += `\n\nContext: Working with table '${context.currentTable}'`;
    }

    if (context.recentQueries?.length) {
      userPrompt += `\n\nRecent queries for context:\n${context.recentQueries.slice(0, 3).map(q => `- ${q}`).join('\n')}`;
    }

    return userPrompt;
  }

  protected buildChatSystemPrompt(context?: SQLContext): string {
    if (!context) {
      return `You are a helpful SQL assistant. Help users with SQL queries, database design, and general database questions.`;
    }

    const tableList = context.tables.map(table => {
      return `- ${table.name} (${table.schema})`;
    }).join('\n');

    return `You are a helpful SQL assistant for ${context.databaseType} databases.

Current database schema:
${tableList}

You can help with:
- Writing SQL queries
- Explaining existing queries  
- Database design advice
- Performance optimization
- Best practices

Always provide practical, actionable advice. If you generate SQL, explain what it does and why.`;
  }

  protected parseSQLResponse(content: string): SQLGenerationResult {
    // Extract SQL query from the response
    const sqlMatch = content.match(/```sql\n(.*?)\n```/s) || content.match(/```\n(.*?)\n```/s);
    let query = '';
    
    if (sqlMatch) {
      query = sqlMatch[1].trim();
    } else {
      // Fallback: look for SQL keywords
      const lines = content.split('\n');
      const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'WITH'];
      const sqlLines = lines.filter(line => 
        sqlKeywords.some(keyword => line.trim().toUpperCase().startsWith(keyword))
      );
      
      if (sqlLines.length > 0) {
        query = sqlLines.join('\n').trim();
      }
    }

    // Extract explanation
    let explanation = content.replace(/```sql\n.*?\n```/s, '').replace(/```\n.*?\n```/s, '').trim();
    
    // Extract warnings
    const warnings: string[] = [];
    const warningMatch = content.match(/warning[s]?[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/gi);
    if (warningMatch) {
      warnings.push(...warningMatch.map(w => w.replace(/warning[s]?[:\-\s]+/i, '').trim()));
    }

    return {
      query: query || content, // Fallback to full content if no query found
      explanation: explanation || 'Query generated successfully.',
      confidence: query ? 0.9 : 0.5, // Higher confidence if we found a proper query
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  protected parseChatResponse(content: string, context?: SQLContext): ChatResponse {
    // Extract SQL if present
    const sqlMatch = content.match(/```sql\n(.*?)\n```/s);
    const query = sqlMatch ? sqlMatch[1].trim() : undefined;

    // Remove SQL blocks from main message
    const message = content.replace(/```sql\n.*?\n```/s, '').trim();

    // Extract follow-up questions
    const followUpMatch = content.match(/follow[- ]?up questions?[:\-\s]+(.*?)(?:\n\n|\n[A-Z]|$)/gi);
    const followUpQuestions: string[] = [];
    
    if (followUpMatch) {
      followUpMatch.forEach(match => {
        const questions = match.replace(/follow[- ]?up questions?[:\-\s]+/i, '').trim();
        // Split by common separators
        const splitQuestions = questions.split(/\n|[?][.\s]*(?=[A-Z])|[?]\s*-\s*/).filter(q => q.trim());
        followUpQuestions.push(...splitQuestions.map(q => q.trim() + (q.trim().endsWith('?') ? '' : '?')));
      });
    }

    return {
      message: message || content,
      query,
      explanation: query ? 'SQL query generated based on your request.' : undefined,
      followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions.slice(0, 3) : undefined
    };
  }

  protected formatSchemaForAnalysis(schema: any): string {
    let description = 'Database Schema:\n\n';

    if (schema.tables?.length) {
      description += 'Tables:\n';
      schema.tables.forEach((table: any) => {
        description += `- ${table.name} (${table.schema})\n`;
      });
      description += '\n';
    }

    if (schema.views?.length) {
      description += 'Views:\n';
      schema.views.forEach((view: any) => {
        description += `- ${view.name} (${view.schema})\n`;
      });
      description += '\n';
    }

    if (schema.procedures?.length) {
      description += 'Stored Procedures:\n';
      schema.procedures.forEach((proc: any) => {
        description += `- ${proc.name} (${proc.schema})\n`;
      });
      description += '\n';
    }

    if (schema.functions?.length) {
      description += 'Functions:\n';
      schema.functions.forEach((func: any) => {
        description += `- ${func.name} (${func.schema})\n`;
      });
    }

    return description;
  }
}
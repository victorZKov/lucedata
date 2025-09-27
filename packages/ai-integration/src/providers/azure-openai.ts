import { AzureOpenAI } from "openai";

import type {
  IAIProvider,
  AIEngineConfig,
  ChatMessage,
  GenerateOptions,
  StreamingChatResponse,
  ToolCall,
} from "../types.js";
import { AIProvider } from "../types.js";

export class AzureOpenAIProvider implements IAIProvider {
  readonly provider = AIProvider.AzureOpenAI;
  readonly config: AIEngineConfig;
  private client: AzureOpenAI;

  constructor(config: AIEngineConfig) {
    this.config = config;

    if (!config.apiKey) {
      throw new Error("Azure OpenAI API key is required");
    }

    if (!config.endpoint) {
      throw new Error("Azure OpenAI endpoint is required");
    }

    // Extract resource name from endpoint URL
    const match = config.endpoint.match(
      /https:\/\/([^.]+)\.openai\.azure\.com/
    );
    if (!match) {
      throw new Error(
        "Invalid Azure OpenAI endpoint format. Expected: https://your-resource.openai.azure.com"
      );
    }

    this.client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: "2024-08-01-preview", // Latest stable API version
      timeout: config.timeoutMs || 30000,
    });
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions) {
    // For Azure, use deployment name as model
    const deploymentName = this.config.defaultModel || "gpt-4o";

    const response = await this.client.chat.completions.create({
      model: deploymentName, // This is actually the deployment name in Azure
      messages: this.convertMessages(messages),
      max_tokens: options?.maxTokens || this.config.maxTokens || 2048,
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      tools: options?.tools,
      tool_choice: options?.tools ? "auto" : undefined,
      stream: false,
    });

    const choice = response.choices[0];
    const content = choice.message.content || "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    return {
      content,
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *generateStream(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): AsyncIterable<StreamingChatResponse> {
    const deploymentName = this.config.defaultModel || "gpt-4o";

    const stream = await this.client.chat.completions.create({
      model: deploymentName,
      messages: this.convertMessages(messages),
      max_tokens: options?.maxTokens || this.config.maxTokens || 2048,
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      tools: options?.tools,
      tool_choice: options?.tools ? "auto" : undefined,
      stream: true,
    });

    let toolCalls: ToolCall[] = [];
    let currentToolCall: Partial<ToolCall> | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        yield { content: delta.content };
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall.id) {
            // New tool call
            if (currentToolCall) {
              toolCalls.push(currentToolCall as ToolCall);
            }
            currentToolCall = {
              id: toolCall.id,
              type: "function",
              function: {
                name: toolCall.function?.name || "",
                arguments: toolCall.function?.arguments || "",
              },
            };
          } else if (currentToolCall && toolCall.function) {
            // Continue existing tool call
            if (toolCall.function.name) {
              currentToolCall.function!.name += toolCall.function.name;
            }
            if (toolCall.function.arguments) {
              currentToolCall.function!.arguments +=
                toolCall.function.arguments;
            }
          }
        }
      }

      // Check if done
      if (chunk.choices[0]?.finish_reason) {
        if (currentToolCall) {
          toolCalls.push(currentToolCall as ToolCall);
        }

        yield {
          done: true,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          usage: chunk.usage
            ? {
                promptTokens: chunk.usage.prompt_tokens,
                completionTokens: chunk.usage.completion_tokens,
                totalTokens: chunk.usage.total_tokens,
              }
            : undefined,
        };
        break;
      }
    }
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.config.apiKey) {
      errors.push("API key is required");
    }

    if (!this.config.endpoint) {
      errors.push("Azure endpoint is required");
    } else {
      const match = this.config.endpoint.match(
        /https:\/\/([^.]+)\.openai\.azure\.com/
      );
      if (!match) {
        errors.push(
          "Invalid Azure endpoint format. Expected: https://your-resource.openai.azure.com"
        );
      }
    }

    if (!this.config.defaultModel) {
      errors.push("Deployment name (model) is required for Azure OpenAI");
    }

    if (
      this.config.temperature !== undefined &&
      (this.config.temperature < 0 || this.config.temperature > 2)
    ) {
      errors.push("Temperature must be between 0 and 2");
    }

    if (this.config.maxTokens !== undefined && this.config.maxTokens < 1) {
      errors.push("Max tokens must be positive");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async testConnection(): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Try to list models to test the connection
      await this.client.models.list();
      return {
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return models.data.map((model: any) => model.id).sort();
    } catch (error) {
      console.warn("Failed to list Azure OpenAI models:", error);
      return ["gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-35-turbo"];
    }
  }

  supportsStreaming(): boolean {
    return true;
  }

  supportsTools(): boolean {
    return true;
  }

  supportsJsonMode(): boolean {
    return true;
  }

  private convertMessages(messages: ChatMessage[]) {
    return messages.map(msg => {
      switch (msg.role) {
        case "system":
          return { role: "system" as const, content: msg.content };
        case "user":
          return { role: "user" as const, content: msg.content };
        case "assistant":
          return {
            role: "assistant" as const,
            content: msg.content,
            tool_calls: msg.toolCalls?.map(tc => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            })),
          };
        case "tool":
          return {
            role: "tool" as const,
            content: msg.content,
            tool_call_id: msg.toolCallId!,
          };
        default:
          throw new Error(`Unsupported message role: ${msg.role}`);
      }
    });
  }
}

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
      apiVersion: "2024-10-21", // Try recent stable API version for model-router
      endpoint: config.endpoint,
      timeout: config.timeoutMs || 90000, // Increased to 90 seconds to match frontend timeout
    });
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions) {
    // For Azure, use deployment name as model (from database configuration)
    const deploymentName = this.config.defaultModel || "gpt-4o"; // Keep gpt-4o as ultimate fallback

    // GPT-5-mini and newer models use max_completion_tokens instead of max_tokens
    // Increased token limit for large execution plans - supports much larger contexts
    const tokenLimit = options?.maxTokens || this.config.maxTokens || 8192;
    // Check for GPT-5 models or model-router which may route to GPT-5
    const isGPT5Model =
      deploymentName.toLowerCase().includes("gpt-5") ||
      deploymentName.toLowerCase().includes("model-router");

    // Log request details
    const totalMessageLength = messages.reduce(
      (sum, msg) => sum + (msg.content?.length || 0),
      0
    );
    console.log(
      `[AzureOpenAI] Request - Model: ${deploymentName}, Messages: ${messages.length}, Total Length: ${totalMessageLength} chars, Token Limit: ${tokenLimit}`
    );

    // Log first message preview for debugging
    if (messages.length > 0 && messages[0].content) {
      const preview = messages[0].content.substring(0, 200);
      console.log(`[AzureOpenAI] First message preview: ${preview}...`);
    }

    // Prepare base parameters
    const baseParams = {
      model: deploymentName, // This is actually the deployment name in Azure
      messages: this.convertMessages(messages),
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      tools: options?.tools,
      tool_choice: options?.tools ? ("auto" as const) : undefined,
      stream: false as const,
    };

    // Add the appropriate token parameter based on model
    const requestParams = isGPT5Model
      ? { ...baseParams, max_completion_tokens: tokenLimit } // GPT-5 uses max_completion_tokens
      : { ...baseParams, max_tokens: tokenLimit };

    let response;
    try {
      console.log(`[AzureOpenAI] Making request to Azure OpenAI...`);
      console.log(`[AzureOpenAI] Endpoint: ${this.client.baseURL}`);
      console.log(`[AzureOpenAI] Deployment: ${deploymentName}`);
      console.log(`[AzureOpenAI] API Version: 2024-10-21`);
      console.log(
        `[AzureOpenAI] Request params: ${JSON.stringify({ ...requestParams, messages: "[REDACTED]" })}`
      );

      response = await this.client.chat.completions.create(
        requestParams as any
      );
      console.log(
        `[AzureOpenAI] Response received - Choices: ${response.choices?.length}, Usage: ${JSON.stringify(response.usage)}`
      );
    } catch (error) {
      console.error(`[AzureOpenAI] Request failed:`, error);
      console.error(`[AzureOpenAI] Error details:`, {
        message: (error as any)?.message,
        status: (error as any)?.status,
        code: (error as any)?.code,
        type: (error as any)?.type,
      });
      throw error;
    }

    const choice = response.choices[0];
    const content = choice.message.content || "";

    // Log response details
    console.log(`[AzureOpenAI] Response content length: ${content.length}`);
    if (content.length === 0) {
      console.warn(
        `[AzureOpenAI] Empty response content! Choice finish_reason: ${choice.finish_reason}`
      );
      console.log(
        `[AzureOpenAI] Full choice object:`,
        JSON.stringify(choice, null, 2)
      );
    } else {
      console.log(
        `[AzureOpenAI] Response preview: ${content.substring(0, 200)}...`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    console.log(
      `[AzureOpenAI] Returning response - Content length: ${content.length}, Tool calls: ${toolCalls?.length || 0}`
    );

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
    const deploymentName = this.config.defaultModel || "gpt-4o"; // Keep gpt-4o as ultimate fallback

    // GPT-5-mini and newer models use max_completion_tokens instead of max_tokens
    // Increased token limit for large execution plans - supports much larger contexts
    const tokenLimit = options?.maxTokens || this.config.maxTokens || 8192;
    // Check for GPT-5 models or model-router which may route to GPT-5
    const isGPT5Model =
      deploymentName.toLowerCase().includes("gpt-5") ||
      deploymentName.toLowerCase().includes("model-router");

    // Prepare base parameters
    const baseStreamParams = {
      model: deploymentName,
      messages: this.convertMessages(messages),
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      tools: options?.tools,
      tool_choice: options?.tools ? ("auto" as const) : undefined,
      stream: true as const,
    };

    // Add the appropriate token parameter based on model
    const streamParams = isGPT5Model
      ? { ...baseStreamParams, max_completion_tokens: tokenLimit } // GPT-5 uses max_completion_tokens
      : { ...baseStreamParams, max_tokens: tokenLimit };

    const stream = (await this.client.chat.completions.create(
      streamParams as any
    )) as any;

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
      return [
        "model-router",
        "gpt-5-mini",
        "gpt-4o",
        "4o-mini",
        "gpt-4",
        "gpt-35-turbo",
      ];
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

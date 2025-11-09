import { AIProvider } from './provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { AnthropicMCPProvider } from './anthropic-mcp-provider.js';
import { OllamaProvider } from './ollama-provider.js';

export interface AIConfig {
  provider: 'anthropic' | 'ollama';
  anthropicApiKey?: string;
  ollamaHost?: string;
  ollamaModel?: string;
  enableMCP?: boolean;
}

export function createAIProvider(config: AIConfig): AIProvider {
  if (config.provider === 'anthropic') {
    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API key is required for Anthropic provider');
    }

    // Use MCP-enabled provider if MCP is enabled
    if (config.enableMCP) {
      return new AnthropicMCPProvider(config.anthropicApiKey);
    }

    return new AnthropicProvider(config.anthropicApiKey);
  }

  if (config.provider === 'ollama') {
    const host = config.ollamaHost || 'http://localhost:11434';
    const model = config.ollamaModel || 'qwen2.5-coder:7b';
    return new OllamaProvider(host, model);
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

export function getConfigFromEnv(): AIConfig {
  const provider = (process.env.AI_PROVIDER || 'anthropic') as 'anthropic' | 'ollama';
  const enableMCP = process.env.ENABLE_MCP === 'true';

  return {
    provider,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    ollamaHost: process.env.OLLAMA_HOST,
    ollamaModel: process.env.OLLAMA_MODEL,
    enableMCP,
  };
}

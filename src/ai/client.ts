// Re-export types and providers for backward compatibility
export type { Message, CommandSuggestion, AIProvider } from './provider.js';
export { AnthropicProvider } from './anthropic-provider.js';
export { OllamaProvider } from './ollama-provider.js';
export { createAIProvider, getConfigFromEnv } from './factory.js';
export type { AIConfig } from './factory.js';

// Legacy export for backward compatibility
import { AnthropicProvider } from './anthropic-provider.js';
export const AIClient = AnthropicProvider;

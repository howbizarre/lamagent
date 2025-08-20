import { Ollama } from '@llamaindex/ollama';
import { Settings } from 'llamaindex';

export interface LLMConfig {
  model?: string;
  host?: string;
}

export function initLLM(config?: LLMConfig) {
  const model = config?.model ?? 'llama3.1:8b';
  const host = config?.host ?? 'http://localhost:11434';

  Settings.llm = new Ollama({
    model,
    config: { host }
  });
}

export function reconfigureLLM(config: LLMConfig) {
  initLLM(config);
}

export const defaultLLMConfig: LLMConfig = { model: 'llama3.1:8b', host: 'http://localhost:11434' };

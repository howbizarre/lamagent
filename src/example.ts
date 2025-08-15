import { agent } from '@llamaindex/workflow';
import { tool, Settings } from 'llamaindex';
import { Ollama } from '@llamaindex/ollama';
import { z } from 'zod';

// Suppress console warnings/logs from LlamaIndex
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('@llamaindex/cloud') || 
      message.includes('LlamaCloud') || 
      message.includes('Tool ') ||
      message.includes('[Agent ') ||
      message.includes('Starting agent') ||
      message.includes('succeeded') ||
      message.includes('No tool calls')) {
    return; // Suppress these messages
  }
  originalConsoleLog(...args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (message.includes('@llamaindex/cloud') || message.includes('deprecated')) {
    return; // Suppress deprecation warnings
  }
  originalConsoleWarn(...args);
};

Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

const sumNumbers = tool({
  name: 'sumNumbers',
  description: 'Add two numbers together. Always use this tool when you need to perform addition.',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to add'),
    b: z.coerce.number().describe('The second number to add')
  }),
  execute: ({ a, b }: { a: number; b: number }) => {
    const result = a + b;
    originalConsoleLog(`│ ✓ ${a} + ${b} = ${result}`);
    return result.toString();
  }
});

const divideNumbers = tool({
  name: 'divideNumbers',
  description: 'Divide one number by another. Always use this tool when you need to perform division.',
  parameters: z.object({
    a: z.coerce.number().describe('The dividend (number to be divided)'),
    b: z.coerce.number().describe('The divisor (number to divide by)')
  }),
  execute: ({ a, b }: { a: number; b: number }) => {
    if (b === 0) {
      originalConsoleLog('│ ✗ Error: Cannot divide by zero');
      return 'Error: Cannot divide by zero';
    }
    const result = a / b;
    originalConsoleLog(`│ ✓ ${a} ÷ ${b} = ${result}`);
    return result.toString();
  }
});

async function main() {
  originalConsoleInfo('┌ Math Problem Solver');
  originalConsoleLog('│');

  const mathAgent = agent({
    timeout: 30000,
    tools: [sumNumbers, divideNumbers],
    verbose: false
  });
  
  const response = await mathAgent.run('Calculate 5 + 5, then divide the result by 2. You must use the available tools: sumNumbers and divideNumbers.');

  originalConsoleLog('│');
  originalConsoleLog(`└ Answer: ${response.data.result}`);
}

void main().then(() => {
  // Restore original console functions
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
});

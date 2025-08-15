import { agent } from '@llamaindex/workflow';
import { tool, Settings } from 'llamaindex';
import { Ollama } from '@llamaindex/ollama';
import { z } from 'zod';

Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

const sumNumbers = tool({
  name: 'sumNumbers',
  description: 'Use this function to sum two numbers',
  parameters: z.object({
    a: z.coerce.number().describe('The first number'),
    b: z.coerce.number().describe('The second number')
  }),

  execute: ({ a, b }: { a: number; b: number }) => `${a + b}`
});

const divideNumbers = tool({
  name: 'divideNumbers',
  description: 'Use this function to divide two numbers',
  parameters: z.object({
    a: z.coerce.number().describe('The dividend a to divide'),
    b: z.coerce.number().describe('The divisor b to divide by')
  }),

  execute: ({ a, b }: { a: number; b: number }) => `${a / b}`
});

async function main() {
  console.info('┌ Begin Thinking...');
  console.log('│');

  const mathAgent = agent({
    timeout: 10000,
    tools: [sumNumbers, divideNumbers],
    verbose: false
  });
  const response = await mathAgent.run('How much is 5 + 5? then divide by 2');

  const { result } = response.data;

  console.log('├', result);
}

void main().then(() => {
  console.log('│');
  console.info('└ Done');
});

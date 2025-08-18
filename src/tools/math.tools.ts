import { Ollama } from '@llamaindex/ollama';
import { tool, Settings } from 'llamaindex';
import { z } from 'zod';

Settings.llm = new Ollama({
  model: 'llama3.1:8b',
  config: {
    host: 'http://localhost:11434'
  }
});

export const sumNumbers = tool({
  name: 'sumNumbers',
  description: 'Add two numbers together. Always use this tool when you need to perform sum or addition.',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to add'),
    b: z.coerce.number().describe('The second number to add')
  }),

  execute: ({ a, b }: { a: number; b: number }) => {
    console.log(`MATH Tool SUM: Calculating sum of ${a} and ${b}`);

    const result = a + b;
    return result.toString();
  }
});

export const divideNumbers = tool({
  name: 'divideNumbers',
  description: 'Divide one number by another. Always use this tool when you need to perform division.',
  parameters: z.object({
    a: z.coerce.number().describe('The dividend (number to be divided)'),
    b: z.coerce.number().describe('The divisor (number to divide by)')
  }),

  execute: ({ a, b }: { a: number; b: number }) => {
    console.log(`MATH Tool DIVIDE: Calculating division of ${a} by ${b}`);

    if (b === 0) {
      return 'Error: Cannot divide by zero';
    }

    const result = a / b;
    return result.toString();
  }
});
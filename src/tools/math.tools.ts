import { tool } from 'llamaindex';
import { z } from 'zod';

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

export const multiplyNumbers = tool({
  name: 'multiplyNumbers',
  description: 'Multiply two numbers together. Always use this tool when you need to perform multiplication.',
  parameters: z.object({
    a: z.coerce.number().describe('The first number to multiply'),
    b: z.coerce.number().describe('The second number to multiply')
  }),

  execute: ({ a, b }: { a: number; b: number }) => {
    console.log(`MATH Tool MULTIPLY: Calculating multiplication of ${a} and ${b}`);

    const result = a * b;
    return result.toString();
  }
});

export const subtractNumbers = tool({
  name: 'subtractNumbers',
  description: 'Subtract one number from another. Always use this tool when you need to perform subtraction.',
  parameters: z.object({
    a: z.coerce.number().describe('The minuend (number to subtract from)'),
    b: z.coerce.number().describe('The subtrahend (number to be subtracted)')
  }),

  execute: ({ a, b }: { a: number; b: number }) => {
    console.log(`MATH Tool SUBTRACT: Calculating subtraction of ${b} from ${a}`);

    const result = a - b;
    return result.toString();
  }
});
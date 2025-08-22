import { tool } from 'llamaindex';
import { z } from 'zod';

/**
 * A tool for adding two numbers together.
 * 
 * This tool provides addition functionality and should always be used when
 * performing sum or addition operations. It accepts two numeric parameters
 * and returns their sum as a string.
 * 
 * @param a - The first number to add
 * @param b - The second number to add
 * @returns The sum of the two numbers as a string
 * 
 * @example
 * ```typescript
 * const result = sumNumbers.execute({ a: 5, b: 3 });
 * console.log(result); // "8"
 * ```
 */
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

/**
 * A tool for dividing one number by another with error handling for division by zero.
 * 
 * @remarks
 * This tool should always be used when division operations are required. It includes
 * built-in validation to prevent division by zero errors and returns results as strings.
 * 
 * @param a - The dividend (number to be divided)
 * @param b - The divisor (number to divide by)
 * 
 * @returns The result of the division as a string, or an error message if division by zero is attempted
 * 
 * @example
 * ```typescript
 * // Valid division
 * divideNumbers.execute({ a: 10, b: 2 }); // Returns "5"
 * 
 * // Division by zero
 * divideNumbers.execute({ a: 10, b: 0 }); // Returns "Error: Cannot divide by zero"
 * ```
 */
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

/**
 * A tool for multiplying two numbers together.
 * 
 * This tool provides a standardized way to perform multiplication operations
 * with proper parameter validation and logging. It should always be used
 * when multiplication is required.
 * 
 * @param a - The first number to multiply
 * @param b - The second number to multiply
 * @returns The result of the multiplication as a string
 * 
 * @example
 * ```typescript
 * const result = multiplyNumbers.execute({ a: 5, b: 3 });
 * console.log(result); // "15"
 * ```
 */
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

/**
 * A tool for performing subtraction operations between two numbers.
 * 
 * This tool subtracts the second number (subtrahend) from the first number (minuend)
 * and returns the result as a string. It includes logging for debugging purposes.
 * 
 * @example
 * ```typescript
 * // Subtract 5 from 10
 * const result = subtractNumbers.execute({ a: 10, b: 5 });
 * console.log(result); // "5"
 * ```
 * 
 * @param parameters - The subtraction parameters
 * @param parameters.a - The minuend (number to subtract from)
 * @param parameters.b - The subtrahend (number to be subtracted)
 * @returns The result of the subtraction as a string
 */
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
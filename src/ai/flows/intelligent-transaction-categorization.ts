'use server';
/**
 * @fileOverview An AI agent for intelligently suggesting and applying categories and subcategories to new financial transactions.
 *
 * - intelligentTransactionCategorization - A function that handles the transaction categorization process.
 * - IntelligentTransactionCategorizationInput - The input type for the intelligentTransactionCategorization function.
 * - IntelligentTransactionCategorizationOutput - The return type for the intelligentTransactionCategorization function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const IntelligentTransactionCategorizationInputSchema = z.object({
  transactionDescription: z.string().describe('The description of the new transaction to categorize.'),
  availableCategories: z.array(z.string()).describe('A list of currently available categories.').optional(),
  availableSubcategories: z.record(z.array(z.string())).describe('A map where keys are categories and values are arrays of available subcategories for that category.').optional(),
});
export type IntelligentTransactionCategorizationInput = z.infer<typeof IntelligentTransactionCategorizationInputSchema>;

const IntelligentTransactionCategorizationOutputSchema = z.object({
  suggestedCategory: z.string().describe('The suggested category for the transaction.'),
  suggestedSubcategory: z.string().describe('The suggested subcategory for the transaction.'),
});
export type IntelligentTransactionCategorizationOutput = z.infer<typeof IntelligentTransactionCategorizationOutputSchema>;

// Tool to simulate fetching past transactions
const getPastTransactions = ai.defineTool(
  {
    name: 'getPastTransactions',
    description: 'Retrieves a list of past transactions with their descriptions, categories, and subcategories based on keywords from the transaction description. Use this tool when you need historical context to categorize a new transaction.',
    inputSchema: z.object({
      keyword: z.string().describe('A keyword or phrase from the transaction description to search for similar past transactions.'),
    }),
    outputSchema: z.array(
      z.object({
        description: z.string(),
        category: z.string(),
        subcategory: z.string(),
      })
    ).describe('A list of past transactions matching the keyword.'),
  },
  async (input) => {
    // This is a mock implementation. In a real application, this would query a database
    // to retrieve actual past transactions based on the keyword.
    console.log(`Tool: getPastTransactions called with keyword: "${input.keyword}"`);
    const mockData = [
      { description: 'Coffee at Starbucks', category: 'Food & Drink', subcategory: 'Coffee' },
      { description: 'Groceries at Walmart', category: 'Groceries', subcategory: 'Supermarket' },
      { description: 'Dinner at Italian Restaurant', category: 'Food & Drink', subcategory: 'Restaurants' },
      { description: 'Monthly Gym Membership', category: 'Health & Fitness', subcategory: 'Gym' },
      { description: 'Netflix Subscription', category: 'Entertainment', subcategory: 'Streaming' },
      { description: 'Electric Bill', category: 'Utilities', subcategory: 'Electricity' },
      { description: 'Internet Bill', category: 'Utilities', subcategory: 'Internet' },
      { description: 'Fuel for car', category: 'Transportation', subcategory: 'Fuel' },
      { description: 'Haircut', category: 'Personal Care', subcategory: 'Hair Salon' },
      { description: 'Online purchase from Amazon', category: 'Shopping', subcategory: 'Online' },
      { description: 'Shopping at H&M', category: 'Shopping', subcategory: 'Clothes' },
    ];
    return mockData.filter(tx => tx.description.toLowerCase().includes(input.keyword.toLowerCase()));
  }
);


const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: { schema: IntelligentTransactionCategorizationInputSchema },
  output: { schema: IntelligentTransactionCategorizationOutputSchema },
  tools: [getPastTransactions],
  prompt: `You are an expert financial assistant tasked with intelligently categorizing financial transactions.\nYour goal is to suggest the most appropriate category and subcategory for a new transaction based on its description and, if helpful, historical transaction data.\n\nIf you need more context to categorize the transaction, use the 'getPastTransactions' tool with a relevant keyword from the transaction description. Analyze the past transactions returned to inform your suggestion.\n\nHere is the new transaction description:\nTransaction Description: {{{transactionDescription}}}\n\n{{#if availableCategories}}\nConsider the following available categories: {{{json availableCategories}}}\n{{/if}}\n\n{{#if availableSubcategories}}\nAnd these available subcategories per category: {{{json availableSubcategories}}}\n{{/if}}\n\nBased on the transaction description and any historical context you retrieve, provide the most suitable category and subcategory. If an exact match for a subcategory isn't found in the provided list (if any), you can infer a logical subcategory or suggest a new one if it's highly specific to the transaction. If categories/subcategories are not provided, make a reasonable suggestion.\n`,
});

const intelligentTransactionCategorizationFlow = ai.defineFlow(
  {
    name: 'intelligentTransactionCategorizationFlow',
    inputSchema: IntelligentTransactionCategorizationInputSchema,
    outputSchema: IntelligentTransactionCategorizationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function intelligentTransactionCategorization(
  input: IntelligentTransactionCategorizationInput
): Promise<IntelligentTransactionCategorizationOutput> {
  return intelligentTransactionCategorizationFlow(input);
}

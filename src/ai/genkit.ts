import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error(
    'Missing GOOGLE_API_KEY environment variable. ' +
    'Set it in your Vercel project settings or in .env.local for local development.',
  );
}

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-2.5-flash',
});

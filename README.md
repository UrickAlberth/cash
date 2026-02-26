# RosaCash

RosaCash is a Next.js 15 personal finance app with Supabase authentication and per-user data persistence.

## Getting Started

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the database schema

In your Supabase project, open the **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql) to create the required tables and Row Level Security policies.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from your Supabase project settings (Settings → API):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
GOOGLE_API_KEY=your-google-api-key-here
```

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

## Deployment (Vercel)

Set the following environment variables in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_API_KEY` – Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey), required for the AI financial assistant

## Features

- **Authentication** – Email/password sign-up and sign-in via Supabase Auth. Session persists across page refreshes.
- **Per-user data** – Transactions, cards, categories, and recurring expenses are stored per user with Row Level Security.
- **AI categorization** – Powered by Google Genkit for intelligent transaction suggestions.


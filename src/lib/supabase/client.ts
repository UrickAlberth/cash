import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tnmcmdmfiuasxwfklywq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRubWNtZG1maXVhc3h3ZmtseXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDIyMjEsImV4cCI6MjA4NzYxODIyMX0.Wgla57pxaTZh1VbxIGKDZmI_Xm8j8TqCaKjdirkRM8Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

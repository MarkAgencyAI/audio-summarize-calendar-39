// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zundvxsatxdrnzthdzej.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1bmR2eHNhdHhkcm56dGhkemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NTkxNDIsImV4cCI6MjA2MDIzNTE0Mn0._UEfsXVIfIDHwpo3TEU97UhXMYMYua-CGccu-KIkU9M";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
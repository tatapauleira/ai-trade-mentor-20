// Placeholder Supabase client. Plug in your external Supabase project here.
//
// 1) bun add @supabase/supabase-js
// 2) Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
// 3) Uncomment the block below.
//
// import { createClient } from "@supabase/supabase-js";
// export const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL!,
//   import.meta.env.VITE_SUPABASE_ANON_KEY!,
// );

export const supabase = {
  // Stub — replace with real client.
  auth: {
    signInWithPassword: async (_: { email: string; password: string }) => ({ data: null, error: null }),
    signUp: async (_: { email: string; password: string }) => ({ data: null, error: null }),
    signOut: async () => ({ error: null }),
  },
};

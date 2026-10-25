// Deployment settings. Safe to publish: the Supabase "anon" key is designed to
// be public (it only allows what your Supabase policies allow). NEVER put the
// YouCam API key here; it lives in a server-side environment variable.
export const CONFIG = {
  // Fill both in to switch email/password login from on-device demo mode to real
  // cloud accounts (see README, "Turn on real accounts").
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Serverless function that holds the YouCam key (api/youcam.js on Vercel).
  YOUCAM_ENDPOINT: '/api/youcam',
};

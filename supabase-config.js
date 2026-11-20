// PUBLIC values only (publishable/anon key). NEVER put a service_role key here.
// Security comes from Row Level Security (see README.md SQL) + the app_name check.
const SUPABASE_URL = "https://otldatnfyvonnfizmxce.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2APp_m8dzG_D3jByrIZsiA_JJxYQX2F";
const APP_NAME = "mls201";
const ADMIN_EMAIL = "olamgeorg9@gmail.com";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

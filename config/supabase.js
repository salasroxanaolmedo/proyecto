const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.DB_SUPABASE_URL;
const supabaseKey = process.env.DB_SUPABASE_KEY;

// Creamos la instancia del cliente
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
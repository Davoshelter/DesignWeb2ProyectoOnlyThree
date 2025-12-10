// js/supabase-client.js

// Asegúrate de que la variable global supabase sea accesible
const { createClient } = supabase;

// Configuración de la conexión a Supabase
const supabaseUrl = "https://hucnplexyzffkdtdsskn.supabase.co";
const supabaseKey = "sb_publishable_P2FqRSW11NxmJqxTK1hPvQ_GCeKgU3O";

// Crear y exportar el cliente de Supabase
// En un entorno de vainilla JS, lo asignamos a una variable global para que sea accesible desde otros scripts.
window.supabaseClient = createClient(supabaseUrl, supabaseKey);
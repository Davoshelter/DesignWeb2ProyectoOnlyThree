// js/supabase-client.js

/**
 * Este archivo es el corazón de la conexión con el backend (Supabase).
 * Su única responsabilidad es crear el cliente de Supabase y hacerlo accesible
 * para todos los demás scripts de la aplicación.
 */

// De la librería global 'supabase' (cargada vía CDN en los HTML),
// extraemos la función 'createClient', que es la que nos permitirá conectarnos.
const { createClient } = supabase;

// --- Credenciales de Supabase ---
// Estas son las claves públicas que identifican nuestro proyecto en Supabase.
// Es seguro exponerlas en el lado del cliente porque tenemos activada
// la Seguridad a Nivel de Fila (Row Level Security - RLS) en nuestra base de datos.
const supabaseUrl = "https://wchrirolydtejmdsuydb.supabase.co";
const supabaseKey = "sb_publishable_ZxXa-lR_uq55ZJz65Ub0qg_P-s08i6j"; // Esta es la clave anónima pública (anon public).

// --- Creación y Exportación del Cliente ---
// Creamos una instancia del cliente de Supabase, que será nuestro objeto
// para realizar todas las operaciones: autenticación, consultas a la base de datos, subida de archivos, etc.
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// En un entorno de JavaScript "vanilla" (sin un sistema de módulos como ES6, CommonJS, etc.),
// la forma más sencilla de compartir una variable entre diferentes archivos .js
// es asignándola al objeto global 'window'. De esta manera, cualquier otro script
// puede acceder al cliente simplemente usando 'window.supabaseClient'.
window.supabaseClient = supabaseClient;
// js/session-manager.js

/**
 * Este archivo es el "gestor de estado de sesión" para la interfaz de usuario.
 * Su responsabilidad es mantener la barra de navegación (navbar) sincronizada
 * con el estado de autenticación del usuario (si está logueado o no).
 * 
 * Es el complemento de 'navbar-loader.js'.
 * El flujo es:
 * 1. navbar-loader.js carga el HTML del navbar.
 * 2. Una vez cargado, llama a la función `initSessionManager` de este archivo.
 * 3. Este script, entonces, toma control del DOM del navbar y lo ajusta.
 */

// --- INICIALIZADOR GLOBAL ---
// Envolvemos toda la lógica en una función global `window.initSessionManager`.
// Esto es CRUCIAL porque los elementos del navbar no existen en el DOM hasta que 
// 'navbar-loader.js' los inyecta. Esta función es llamada explícitamente
// por 'navbar-loader.js' justo después de inyectar el HTML.
window.initSessionManager = async () => {
    const supabase = window.supabaseClient;

    // --- SELECCIÓN DE ELEMENTOS DEL NAVBAR ---
    // Estos elementos fueron cargados dinámicamente.
    const navGuest = document.getElementById('nav-guest'); // Contenedor para botones de invitado (Login, Register).
    const navUser = document.getElementById('nav-user');   // Contenedor para botones de usuario (Mi Portfolio, Logout).
    const navPortfolioLink = document.getElementById('nav-portfolio-link'); // Enlace específico a "Mi Portfolio".
    
    // Resaltado del enlace de la página activa.
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const activeLink = document.querySelector(`.navbar-nav .nav-link[href="${currentPage}"]`);
    if(activeLink) {
        activeLink.classList.add('active'); // Añade la clase 'active' de Bootstrap.
    }

    /**
     * Función central que actualiza la UI del navbar basado en la presencia de un usuario.
     * @param {object|null} user - El objeto 'user' de Supabase si está logueado, o 'null' si no lo está.
     */
    const updateNavUI = (user) => {
        // Medida de seguridad por si los elementos del navbar no se cargaron correctamente.
        if (!navGuest || !navUser) return;

        if (user) {
            // --- ESTADO: USUARIO LOGUEADO ---
            
            // 1. Ocultar el panel de invitados y mostrar el panel de usuario.
            navGuest.classList.add('d-none');
            navUser.classList.remove('d-none');
            
            // 2. Actualizar el enlace "Mi Portfolio" para que apunte al portfolio del usuario actual.
            if (navPortfolioLink) {
                navPortfolioLink.href = `portfolio.html?userId=${user.id}`;
            }

            // 3. MANEJO ESPECIAL DEL BOTÓN DE LOGOUT
            // Buscamos el botón en el DOM en este preciso momento.
            const currentLogoutBtn = document.getElementById('logout-button');
            if (currentLogoutBtn) {
                // PROBLEMA: Si solo añadiéramos un `addEventListener`, en cada cambio de estado
                // (aunque no sea visible para el usuario) se podría añadir un nuevo listener,
                // resultando en múltiples listeners en el mismo botón.
                // SOLUCIÓN: Clonamos el botón. Esto crea un nuevo nodo idéntico pero SIN listeners.
                const newBtn = currentLogoutBtn.cloneNode(true);
                
                // Reemplazamos el botón antiguo por nuestro clon limpio.
                currentLogoutBtn.parentNode.replaceChild(newBtn, currentLogoutBtn);
                
                // Ahora, añadimos el único listener de 'click' a nuestro nuevo botón.
                newBtn.addEventListener('click', async () => {
                    await supabase.auth.signOut(); // Cerramos la sesión en Supabase.
                    // Al cerrar sesión, onAuthStateChange se disparará, pero también redirigimos
                    // manualmente por si acaso y para una respuesta más rápida.
                    window.location.href = 'index.html';
                });
            }

        } else {
            // --- ESTADO: USUARIO NO LOGUEADO (INVITADO) ---
            
            // Invertimos la visibilidad: mostramos el panel de invitados y ocultamos el de usuario.
            navGuest.classList.remove('d-none');
            navUser.classList.add('d-none');
        }
    };

    // --- EJECUCIÓN INICIAL Y SUSCRIPCIÓN A CAMBIOS ---

    // 1. OBTENER SESIÓN INICIAL:
    // Al cargar la página, primero comprobamos si ya existe una sesión activa.
    const { data: { session } } = await supabase.auth.getSession();
    // Y llamamos a nuestra función de UI por primera vez con el resultado.
    updateNavUI(session?.user); // El ?. es opcional chaining, previene error si session es null.

    // 2. ESCUCHAR CAMBIOS DE ESTADO:
    // `onAuthStateChange` es un "oyente" de Supabase. Se ejecuta automáticamente
    // cada vez que un usuario inicia sesión, cierra sesión o su token se refresca.
    // Esto es lo que hace que nuestra UI sea reactiva y cambie en tiempo real sin
    // necesidad de recargar la página.
    supabase.auth.onAuthStateChange((_event, session) => {
        // Cuando el estado cambia, simplemente volvemos a llamar a nuestra función de UI
        // con la información de la nueva sesión.
        updateNavUI(session?.user);
    });
};

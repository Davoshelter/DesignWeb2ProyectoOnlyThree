// js/session-manager.js (MODULARIZADO y CORREGIDO)

// Definimos la función globalmente para poder llamarla cuando el navbar cargue
window.initSessionManager = async () => {
    const supabase = window.supabaseClient;

    // Elementos del DOM (Que ahora vienen del fetch)
    const navGuest = document.getElementById('nav-guest');
    const navUser = document.getElementById('nav-user');
    const navPortfolioLink = document.getElementById('nav-portfolio-link');
    
    // Link estático de configuración (si existe en el menú principal)
    const staticSettingsLink = document.querySelector('.navbar-nav .nav-link[href="settings.html"]');
    
    // Link activo (highlight)
    const currentPage = window.location.pathname.split("/").pop() || 'index.html';
    const activeLink = document.querySelector(`.navbar-nav .nav-link[href="${currentPage}"]`);
    if(activeLink) activeLink.classList.add('active');


    const updateNavUI = (user) => {
        if (!navGuest || !navUser) return; // Seguridad si falta HTML

        if (user) {
            // === USUARIO LOGUEADO ===
            
            // 1. Ocultar panel de invitados
            navGuest.classList.add('d-none');
            navGuest.classList.remove('d-flex');

            // 2. Mostrar panel de usuario
            navUser.classList.remove('d-none');
            navUser.classList.add('d-flex');
            
            // 3. Ocultar link estático de configuración
            if (staticSettingsLink) staticSettingsLink.parentElement.style.display = 'none';

            // 4. Actualizar el link "Mi Portfolio"
            if (navPortfolioLink) {
                navPortfolioLink.href = `portfolio.html?userId=${user.id}`;
            }

            // 5. Manejo del Botón Logout (CORREGIDO)
            // Buscamos el botón actual en el DOM en este momento exacto
            const currentLogoutBtn = document.getElementById('logout-button');
            
            if (currentLogoutBtn) {
                // Clonamos el botón para limpiar cualquier listener anterior
                const newBtn = currentLogoutBtn.cloneNode(true);
                
                // Si el botón tiene padre (está en el DOM), lo reemplazamos
                if (currentLogoutBtn.parentNode) {
                    currentLogoutBtn.parentNode.replaceChild(newBtn, currentLogoutBtn);
                }
                
                // Añadimos el evento al nuevo botón
                newBtn.addEventListener('click', async () => {
                    await supabase.auth.signOut();
                    window.location.href = 'index.html';
                });
            }

        } else {
            // === USUARIO NO LOGUEADO ===
            
            // 1. Mostrar panel de invitados
            navGuest.classList.remove('d-none');
            navGuest.classList.add('d-flex');

            // 2. Ocultar panel de usuario
            navUser.classList.add('d-none');
            navUser.classList.remove('d-flex');

            // 3. Restaurar link estático
            if (staticSettingsLink) staticSettingsLink.parentElement.style.display = 'block';
        }
    };

    // Inicialización
    const { data: { session } } = await supabase.auth.getSession();
    updateNavUI(session?.user);

    // Escuchar cambios de sesión
    supabase.auth.onAuthStateChange((_event, session) => {
        updateNavUI(session?.user);
    });
};

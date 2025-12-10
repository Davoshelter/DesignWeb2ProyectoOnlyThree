// js/session-manager.js
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    
    // Función para actualizar la UI de la barra de navegación
    const updateNavUI = (user) => {
        const navbarNav = document.querySelector('#navbarNav .navbar-nav');
        const existingControls = document.getElementById('user-session-controls');
        if (existingControls) {
            existingControls.remove();
        }

        const navContainer = navbarNav.parentElement; // El contenedor .collapse

        if (user) {
            // Usuario ha iniciado sesión
            // Ocultar "Configuración" del menú principal si existe
            const settingsLink = navbarNav.querySelector('a[href="settings.html"]');
            if(settingsLink) settingsLink.parentElement.style.display = 'none';
            
            // Ocultar botón de Registro
            const registerButton = navContainer.querySelector('a.btn-nav-register');
            if(registerButton) registerButton.style.display = 'none';

            // Crear nuevos controles
            const sessionControls = document.createElement('div');
            sessionControls.id = 'user-session-controls';
            sessionControls.classList.add('d-flex', 'align-items-center', 'ms-lg-3');
            sessionControls.innerHTML = `
                <a href="settings.html" class="btn btn-outline-light btn-sm me-2">Mi Configuración</a>
                <button id="logout-button" class="btn btn-danger btn-sm">Cerrar Sesión</button>
            `;
            
            navContainer.appendChild(sessionControls);

            // Añadir evento al botón de logout
            const logoutButton = document.getElementById('logout-button');
            logoutButton.addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            });

        } else {
            // Usuario no ha iniciado sesión
            const settingsLink = navbarNav.querySelector('a[href="settings.html"]');
            if(settingsLink) settingsLink.parentElement.style.display = 'list-item';

            const registerButton = navContainer.querySelector('a.btn-nav-register');
            if(registerButton) registerButton.style.display = 'block';

            // Crear el botón de login
             const sessionControls = document.createElement('div');
            sessionControls.id = 'user-session-controls';
            sessionControls.classList.add('d-flex', 'align-items-center', 'ms-lg-3');
            sessionControls.innerHTML = '<a href="login.html" class="btn btn-outline-primary ms-lg-3 mt-2 mt-lg-0">Login</a>';
            
            navContainer.appendChild(sessionControls);
        }
    };

    // Obtener la sesión actual y actualizar la UI
    const { data: { session } } = await supabase.auth.getSession();
    updateNavUI(session?.user);

    // Escuchar cambios en la sesión (login, logout)
    supabase.auth.onAuthStateChange((_event, session) => {
        updateNavUI(session?.user);
    });
});

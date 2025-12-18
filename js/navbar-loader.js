// js/navbar-loader.js

/**
 * Este script implementa un patrón de "componentes reutilizables" en JavaScript vanilla.
 * Su única responsabilidad es cargar dinámicamente el HTML de la barra de navegación 
 * (desde components/navbar.html) e inyectarlo en cualquier página que lo necesite.
 * 
 * ¿Por qué hacer esto?
 * Para no tener que copiar y pegar el mismo código HTML del navbar en cada archivo .html de la web.
 * Esto centraliza el navbar, facilitando su mantenimiento: si se cambia algo en navbar.html,
 * el cambio se refleja automáticamente en todas las páginas.
 * 
 * Este script debe ser incluido en cada página que quiera mostrar el navbar.
 */
document.addEventListener("DOMContentLoaded", function() {
    // Buscamos en la página un contenedor con el id 'navbar-container'.
    // Este div vacío actuará como el "hueco" donde se insertará el navbar.
    const navbarContainer = document.getElementById("navbar-container");

    if (navbarContainer) {
        // Si encontramos el contenedor, usamos la API fetch para obtener el contenido
        // del archivo HTML del componente.
        fetch("components/navbar.html")
            .then(response => {
                // Verificamos que la petición fue exitosa.
                if (!response.ok) {
                    throw new Error("No se pudo cargar el componente navbar. Status: " + response.status);
                }
                // Convertimos la respuesta en texto (el contenido HTML).
                return response.text();
            })
            .then(data => {
                // --- INYECCIÓN Y COORDINACIÓN ---
                
                // 1. Inyectamos el HTML del navbar dentro de nuestro div contenedor.
                navbarContainer.innerHTML = data;

                // 2. ¡Paso CRÍTICO! Llamamos al inicializador del Session Manager.
                // El script 'session-manager.js' necesita manipular los elementos del navbar
                // (ej: mostrar/ocultar botones de login/logout).
                // Como esos elementos NO EXISTÍAN hasta que inyectamos el HTML en el paso anterior,
                // no podemos ejecutar la lógica del session manager directamente.
                // Por eso, 'session-manager.js' expone una función global 'window.initSessionManager'.
                // La llamamos aquí para asegurarnos de que su lógica se ejecuta DESPUÉS de que el navbar esté en el DOM.
                if (window.initSessionManager) {
                    window.initSessionManager();
                } else {
                    // Este error es grave, significa que el script del session manager no se cargó correctamente.
                    console.error("Error Crítico: La función 'window.initSessionManager' no fue encontrada. El script 'session-manager.js' podría estar faltando o fallando al cargar.");
                }
            })
            .catch(error => {
                // Si fetch o alguna de las promesas falla, lo mostramos en consola.
                console.error("Error Crítico: No se pudo cargar el componente del navbar:", error);
                navbarContainer.innerHTML = "<p class='text-center text-danger'>Error al cargar la barra de navegación.</p>";
            });
    } else {
        // Si una página incluye este script pero no tiene el div contenedor, avisamos del error.
        console.error("Error Crítico: No se encontró el div con id='navbar-container' en este documento.");
    }
});

document.addEventListener("DOMContentLoaded", function() {
    console.log("[Navbar Loader] DOMContentLoaded event fired.");
    const navbarContainer = document.getElementById("navbar-container");

    if (navbarContainer) {
        console.log("[Navbar Loader] Found navbar-container. Fetching navbar.html...");
        fetch("components/navbar.html")
            .then(response => {
                if (!response.ok) {
                    throw new Error("No se pudo cargar el navbar. Status: " + response.status);
                }
                console.log("[Navbar Loader] fetch() successful.");
                return response.text();
            })
            .then(data => {
                console.log("[Navbar Loader] Injecting navbar HTML into container.");
                // 1. Inyectar el HTML del navbar
                navbarContainer.innerHTML = data;

                // 2. Inicializar el Session Manager (porque el HTML ya existe)
                if (window.initSessionManager) {
                    console.log("[Navbar Loader] window.initSessionManager found. Calling it now.");
                    window.initSessionManager();
                } else {
                    console.error("[Navbar Loader] FATAL: window.initSessionManager not found. Session manager script might be missing or failing.");
                }
            })
            .catch(error => {
                console.error("[Navbar Loader] FATAL: Error loading navbar component:", error);
            });
    } else {
        console.error("[Navbar Loader] FATAL: Could not find the div with id='navbar-container' in the document.");
    }
});

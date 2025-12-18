// js/users.js

/**
 * Este archivo gestiona la página 'users.html', que muestra una galería
 * con todos los creadores de la plataforma.
 * Sus responsabilidades son:
 * 1. Cargar la lista completa de perfiles desde la tabla 'profiles' de Supabase.
 * 2. Renderizar (dibujar) una "tarjeta de usuario" por cada perfil obtenido.
 * 3. Implementar una funcionalidad de búsqueda en tiempo real que filtra los
 *    usuarios mostrados según lo que se escribe en un campo de texto.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    const userListContainer = document.getElementById('user-list-container');
    const searchInput = document.getElementById('user-search-input');

    // Si el contenedor principal no existe en la página, no continuamos.
    if (!userListContainer) return;

    // --- CACHÉ LOCAL DE PERFILES ---
    // Guardaremos todos los perfiles aquí una vez cargados.
    // Esto es una optimización clave: en lugar de hacer una nueva consulta a la base de datos
    // cada vez que el usuario busca, filtramos esta copia local, lo que es mucho más rápido.
    let allProfiles = []; 

    showLoader();

    // --- 1. CARGA INICIAL DE PERFILES ---
    // Hacemos una única consulta a Supabase para traernos los datos esenciales de todos los perfiles.
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, about, profile_picture_url'); // Solo seleccionamos las columnas que necesitamos.

    hideLoader();

    if (error) {
        // Si hay un error al cargar los datos, lo mostramos en la consola y en la página.
        console.error("Error al cargar los perfiles:", error);
        userListContainer.innerHTML = '<p class="text-danger text-center">Error cargando usuarios.</p>';
        return;
    }

    // Guardamos los datos en nuestra "caché" local.
    allProfiles = profiles || [];

    // --- 2. FUNCIÓN DE RENDERIZADO ---
    /**
     * Se encarga de dibujar las tarjetas de usuario en el DOM.
     * @param {Array} profilesToRender - Un array de objetos de perfil que se deben mostrar.
     */
    const renderProfiles = (profilesToRender) => {
        // Limpiamos el contenedor para asegurarnos de no duplicar contenido en re-renderizados (como al buscar).
        userListContainer.innerHTML = ''; 

        if (profilesToRender.length === 0) {
            // Si no hay perfiles que mostrar (ej: una búsqueda sin resultados), lo indicamos.
            userListContainer.innerHTML = '<p class="text-white-50 text-center">No se encontraron usuarios.</p>';
            return;
        }

        // Iteramos sobre cada perfil y construimos su tarjeta HTML.
        profilesToRender.forEach(profile => {
            // Si el usuario no tiene foto de perfil, usamos un avatar genérico.
            const avatarUrl = profile.profile_picture_url 
                ? `${profile.profile_picture_url}?width=200&height=200` 
                : `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profile.name || '')}`;
            
            // Acortamos la biografía para que no rompa el diseño de la tarjeta.
            const shortBio = profile.about 
                ? (profile.about.length > 80 ? profile.about.substring(0, 80) + '...' : profile.about) 
                : 'Sin biografía.';

            const userCardHTML = `
                <div class="col-lg-4 col-md-6 fade-in-up">
                    <a href="portfolio.html?userId=${profile.id}" class="text-decoration-none">
                        <div class="glass-card h-100 text-center p-4 user-card position-relative overflow-hidden">
                            <div class="card-body">
                                <img src="${avatarUrl}" alt="${profile.name}" class="rounded-circle mb-3 border border-2 border-secondary" style="width: 100px; height: 100px; object-fit: cover;">
                                <h5 class="card-title mt-2 text-white fw-bold">${profile.name || 'Usuario'}</h5>
                                <p class="card-text text-white-50 small">${shortBio}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
            // Añadimos la tarjeta recién creada al contenedor.
            userListContainer.innerHTML += userCardHTML;
        });
    };

    // --- 3. RENDERIZADO INICIAL ---
    // La primera vez que la página carga, llamamos a la función para mostrar todos los perfiles.
    renderProfiles(allProfiles);

    // --- 4. IMPLEMENTACIÓN DE LA BÚSQUEDA ---
    if (searchInput) {
        // Escuchamos el evento 'input', que se dispara cada vez que el valor del campo de búsqueda cambia.
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase(); // Convertimos a minúsculas para una búsqueda sin distinción de mayúsculas.
            
            // Filtramos nuestra caché local 'allProfiles'.
            const filtered = allProfiles.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchTerm))
            );

            // Volvemos a renderizar la lista, pero esta vez solo con los perfiles filtrados.
            renderProfiles(filtered);
        });
    }
});
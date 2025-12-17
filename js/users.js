// js/users.js
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    const userListContainer = document.getElementById('user-list-container');
    const searchInput = document.getElementById('user-search-input');

    if (!userListContainer) return;

    let allProfiles = []; // Guardamos copia local para filtrar rápido

    // Mostrar loader
    showLoader();

    // 1. Cargar perfiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, about, profile_picture_url');

    hideLoader();

    if (error) {
        console.error(error);
        userListContainer.innerHTML = '<p class="text-danger text-center">Error cargando usuarios.</p>';
        return;
    }

    // Guardar en variable global del script
    allProfiles = profiles || [];

    // 2. Función de Renderizado
    const renderProfiles = (profilesToRender) => {
        userListContainer.innerHTML = ''; 

        if (profilesToRender.length === 0) {
            userListContainer.innerHTML = '<p class="text-white-50 text-center">No se encontraron usuarios.</p>';
            return;
        }

        profilesToRender.forEach(profile => {
            const avatarUrl = profile.profile_picture_url ? `${profile.profile_picture_url}?width=200&height=200` : `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profile.name || '')}`;
            // Cortar biografía si es muy larga
            const shortBio = profile.about ? (profile.about.length > 80 ? profile.about.substring(0, 80) + '...' : profile.about) : 'Sin biografía.';

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
            userListContainer.innerHTML += userCardHTML;
        });
    };

    // 3. Renderizar inicial
    renderProfiles(allProfiles);

    // 4. Evento de Búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = allProfiles.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchTerm))
            );
            renderProfiles(filtered);
        });
    }
});
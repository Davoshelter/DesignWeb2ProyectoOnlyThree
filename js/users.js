document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    const userListContainer = document.getElementById('user-list-container');

    if (!userListContainer) return;

    // Mostrar un estado de carga
    userListContainer.innerHTML = '<p class="text-white-50 text-center">Cargando creadores...</p>';

    // Cargar todos los perfiles desde Supabase
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, about, profile_picture_url');

    if (error) {
        console.error('Error cargando perfiles:', error);
        userListContainer.innerHTML = '<p class="text-danger text-center">No se pudieron cargar los usuarios.</p>';
        return;
    }

    if (profiles && profiles.length > 0) {
        userListContainer.innerHTML = ''; // Limpiar el contenedor
        profiles.forEach(profile => {
            const avatarUrl = profile.profile_picture_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profile.name || '')}`;
            const userCardHTML = `
                <div class="col-lg-4 col-md-6">
                    <a href="portfolio.html?userId=${profile.id}" class="text-decoration-none">
                        <div class="glass-card h-100 text-center p-4 user-card">
                            <div class="card-body">
                                <img src="${avatarUrl}" alt="Avatar de ${profile.name}" class="rounded-circle mb-3" style="width: 100px; height: 100px; object-fit: cover;">
                                <h5 class="card-title mt-2 text-white fw-bold">${profile.name || 'Usuario'}</h5>
                                <p class="card-text text-white-50 small">${profile.about || 'Sin biografía.'}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
            userListContainer.innerHTML += userCardHTML;
        });
    } else {
        userListContainer.innerHTML = '<p class="text-white-50 text-center">Aún no hay creadores registrados.</p>';
    }
});

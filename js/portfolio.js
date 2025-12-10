document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;

    // --- SELECTORES DEL DOM ---
    const root = document.documentElement;
    const body = document.body;
    const profileImage = document.getElementById('profile-image');
    const userNameElement = document.getElementById('profile-name');
    const userBioElement = document.getElementById('profile-bio');
    const galleryGrid = document.querySelector('.masonry-grid');
    const pageTitle = document.querySelector('title');
    const mainContainer = document.querySelector('main.container');

    // --- SELECTORES DEL MODAL ---
    const imageDetailModal = new bootstrap.Modal(document.getElementById('imageDetailModal'));
    const modalImage = document.getElementById('modal-image');
    const modalUserAvatar = document.getElementById('modal-user-avatar');
    const modalUserName = document.getElementById('modal-user-name');
    const modalImageDescription = document.getElementById('modal-image-description');

    // 1. OBTENER USUARIO DE LA URL Y CARGAR SUS DATOS DESDE SUPABASE
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('userId'); // El ID en la URL es el de la tabla auth.users

    if (!profileId) {
        displayError('ID de usuario no especificado.');
        return;
    }
    
    // Cargar perfil y galería en paralelo
    const [profileResponse, galleryResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).single(),
        supabase.from('gallery_images').select('*').eq('profile_id', profileId)
    ]);

    const { data: profile, error: profileError } = profileResponse;
    const { data: galleryImages, error: galleryError } = galleryResponse;

    if (profileError || !profile) {
        console.error('Error cargando perfil:', profileError);
        displayError(`Usuario no encontrado.`);
        return;
    }
    
    if (galleryError) {
        console.error('Error cargando galería:', galleryError);
        // No es un error fatal, podemos mostrar el perfil sin la galería
    }

    // 2. APLICAR DATOS Y CONFIGURACIÓN DEL USUARIO
    applyUserData(profile);
    applySettings(profile);
    renderGallery(profile, galleryImages || []);
    checkAndDisplayEditControls(profile.id);


    function displayError(message) {
        if (mainContainer) {
            mainContainer.innerHTML = `
                <div class="text-center text-white-50">
                    <h2 class="text-white">Error</h2>
                    <p>${message}</p>
                    <a href="users.html" class="btn btn-primary">Volver a la lista de usuarios</a>
                </div>`;
        }
    }

    async function checkAndDisplayEditControls(profileUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === profileUserId) {
            const header = userNameElement.parentElement;
            if (header) {
                const editControlsHTML = `
                    <div class="mt-3 d-flex gap-2 justify-content-center">
                        <a href="settings.html" class="btn btn-outline-light btn-sm"><i class="bi bi-pencil-fill me-1"></i> Editar Perfil y Diseño</a>
                        <a href="add-image.html" class="btn btn-primary btn-sm"><i class="bi bi-plus-circle-fill me-1"></i> Añadir Imagen</a>
                    </div>`;
                const staticEditButton = header.querySelector('a[href="settings.html"]');
                if (staticEditButton) staticEditButton.remove();
                header.insertAdjacentHTML('beforeend', editControlsHTML);
            }
        }
    }

    function applyUserData(profileData) {
        if (pageTitle) pageTitle.textContent = `Portfolio de ${profileData.name} - OwnDesign`;
        if (userNameElement) userNameElement.textContent = profileData.name;
        if (userBioElement) userBioElement.textContent = profileData.about;
        if (profileImage && profileData.profile_picture_url) {
            // Añadimos un timestamp a la URL para evitar problemas de caché
            profileImage.src = `${profileData.profile_picture_url}?t=${new Date().getTime()}`;
        } else if (profileImage) {
            profileImage.src = `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profileData.name)}`;
        }
    }

    function applySettings(profileData) {
        const fontColor = profileData.secondary_color; 
        if (fontColor) {
            body.style.color = fontColor;
            document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a').forEach(el => el.style.color = fontColor);
        }

        body.style.fontFamily = profileData.font_family?.replace(/'/g, "") || 'Poppins';
        root.style.fontSize = profileData.font_size ? `${profileData.font_size}px` : '16px';
        root.style.setProperty('--electric-blue', profileData.primary_color || '#05B0FA');

        // Aplicar nuevos estilos al perfil y a la galería
        if (profileImage) {
            profileImage.style.borderRadius = `${profileData.profile_border_radius || 50}%`;
            profileImage.style.border = `${profileData.profile_frame_width || 0}px solid ${profileData.profile_frame_color || 'transparent'}`;
        }
        if (galleryGrid) {
            galleryGrid.style.columnGap = `${profileData.gallery_gap || 1.5}rem`;
            // El column-count se sigue manejando por CSS media queries, lo cual es correcto.
        }
    }

    function renderGallery(profileData, images) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = ''; 

        if (!images || images.length === 0) {
            galleryGrid.innerHTML = '<p class="text-white-50">Este usuario aún no ha subido imágenes.</p>';
            return;
        }

        const userAvatar = profileData.profile_picture_url || `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profileData.name)}`;

        images.forEach(image => {
            const item = document.createElement('div');
            item.className = 'masonry-item';
            item.style.marginBottom = `${profileData.gallery_gap || 1.5}rem`;
            item.style.cursor = 'pointer';

            const img = document.createElement('img');
            img.src = image.image_url;
            img.alt = image.title || `Imagen de ${profileData.name}`;
            // Aplicar estilos de borde a cada imagen de la galería
            img.style.border = `${profileData.gallery_frame_width || 0}px solid ${profileData.gallery_frame_color || 'transparent'}`;

            item.addEventListener('click', () => {
                if (modalImage) modalImage.src = image.image_url;
                if (modalUserAvatar) modalUserAvatar.src = userAvatar;
                if (modalUserName) modalUserName.textContent = profileData.name;
                if (modalImageDescription) modalImageDescription.textContent = image.description;
                imageDetailModal.show();
            });

            item.appendChild(img);
            galleryGrid.appendChild(item);
        });
    }
});
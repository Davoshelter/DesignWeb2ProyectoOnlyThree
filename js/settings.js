document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    const settingsForm = document.querySelector('.settings-form');
    const saveModal = new bootstrap.Modal(document.getElementById('saveModal'));

    // 1. OBTENER USUARIO Y PROTEGER LA RUTA
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        // Si no hay usuario, no debería estar aquí. Redirigir a login.
        window.location.href = 'login.html';
        return;
    }

    // 2. ACTUALIZAR ENLACE DEL MODAL
    const viewPortfolioButton = document.getElementById('view-portfolio-button');
    if(viewPortfolioButton) {
        viewPortfolioButton.href = `portfolio.html?userId=${user.id}`;
    }

    // Mapeo de IDs de Formulario -> Nombres de Columna en Supabase
    const settingsMap = {
        'fontFamily': 'font_family',
        'baseFontSize': 'font_size',
        'primaryColor': 'primary_color',
        'fontColor': 'secondary_color',
        'userName': 'name',
        'userBio': 'about',
        'profileBorderRadius': 'profile_border_radius',
        'profileFrameColor': 'profile_frame_color',
        'profileFrameWidth': 'profile_frame_width',
        'galleryFrameColor': 'gallery_frame_color',
        'galleryFrameWidth': 'gallery_frame_width',
        'galleryGap': 'gallery_gap'
    };

    // --- CARGAR DATOS DESDE SUPABASE ---
    async function loadSettings() {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error cargando el perfil:', error);
            alert('No se pudo cargar tu perfil. Inténtalo de nuevo.');
            return;
        }

        if (profile) {
            for (const [inputId, columnName] of Object.entries(settingsMap)) {
                const inputElement = document.getElementById(inputId);
                if (inputElement && profile[columnName] !== null) {
                    inputElement.value = profile[columnName];
                }
            }
             // Cargar imagen de perfil
            const previewAvatar = document.getElementById('preview-avatar');
            if (previewAvatar && profile.profile_picture_url) {
                // Añadimos un timestamp para evitar problemas de caché si se sube una nueva imagen con el mismo nombre
                previewAvatar.src = `${profile.profile_picture_url}?t=${new Date().getTime()}`;
            }
        }
        updateLivePreviews();
    }

    // --- GUARDAR DATOS EN SUPABASE ---
    async function saveSettings() {
        const updates = {
            // El ID ya no es necesario aquí, se usa en el .eq()
            updated_at: new Date(),
        };

        for (const [inputId, columnName] of Object.entries(settingsMap)) {
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                updates[columnName] = inputElement.value;
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error('Error guardando el perfil:', error);
            alert(`Hubo un error al guardar tu configuración: ${error.message}`);
        } else {
            saveModal.show();
        }
    }
    
    // --- SUBIDA DE AVATAR A SUPABASE STORAGE ---
    const userAvatarFile = document.getElementById('userAvatarFile');
    if (userAvatarFile) {
        userAvatarFile.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Subir la imagen
            let { error: uploadError } = await supabase.storage
                .from('imagenes') // El nombre de tu bucket
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                console.error('Error al subir la imagen:', uploadError);
                alert('No se pudo subir la imagen de perfil.');
                return;
            }

            // Obtener la URL pública de la imagen
            const { data } = supabase.storage
                .from('imagenes')
                .getPublicUrl(filePath);

            const publicURL = data.publicUrl;

            // Guardar la URL en la tabla de perfiles
            const { error: urlError } = await supabase
                .from('profiles')
                .update({ profile_picture_url: publicURL })
                .eq('id', user.id);
            
            if(urlError) {
                console.error('Error al guardar la URL del avatar:', urlError);
            } else {
                 // Actualizar la imagen en la vista previa inmediatamente
                const previewAvatar = document.getElementById('preview-avatar');
                previewAvatar.src = `${publicURL}?t=${new Date().getTime()}`;
            }
        });
    }

    // --- VISTA PREVIA ---
    function updateLivePreviews() {
        const getVal = (id) => document.getElementById(id)?.value;

        // --- Actualizar Badges de los Sliders ---
        if(document.getElementById('baseFontSizeValue')) document.getElementById('baseFontSizeValue').textContent = `${getVal('baseFontSize')}px`;
        if(document.getElementById('profileBorderRadiusValue')) document.getElementById('profileBorderRadiusValue').textContent = `${getVal('profileBorderRadius')}%`;
        if(document.getElementById('profileFrameWidthValue')) document.getElementById('profileFrameWidthValue').textContent = `${getVal('profileFrameWidth')}px`;
        if(document.getElementById('galleryFrameWidthValue')) document.getElementById('galleryFrameWidthValue').textContent = `${getVal('galleryFrameWidth')}px`;
        if(document.getElementById('galleryGapValue')) document.getElementById('galleryGapValue').textContent = `${getVal('galleryGap')}rem`;

        // --- Actualizar Vista Previa ---
        const previewContainer = document.getElementById('live-preview-container');
        if (!previewContainer) return;
        
        // Estilos generales
        previewContainer.style.fontFamily = getVal('fontFamily')?.replace(/'/g, "") || 'Poppins';
        previewContainer.style.fontSize = `${getVal('baseFontSize')}px`;
        previewContainer.style.color = getVal('fontColor');
        previewContainer.style.setProperty('--electric-blue', getVal('primaryColor'));
        
        // Perfil
        const previewAvatar = document.getElementById('preview-avatar');
        if(previewAvatar) {
            previewAvatar.style.borderRadius = `${getVal('profileBorderRadius')}%`;
            previewAvatar.style.border = `${getVal('profileFrameWidth')}px solid ${getVal('profileFrameColor')}`;
        }
        const previewName = document.getElementById('preview-name');
        if(previewName) previewName.textContent = getVal('userName');
        
        const previewBio = document.getElementById('preview-bio');
        if(previewBio) previewBio.textContent = getVal('userBio');

        // Galería
        const previewGallery = document.getElementById('preview-gallery');
        if(previewGallery) {
            previewGallery.style.gap = `${getVal('galleryGap')}rem`;
            const galleryImagePreview = previewGallery.querySelector('img');
            if(galleryImagePreview) {
                galleryImagePreview.style.border = `${getVal('galleryFrameWidth')}px solid ${getVal('galleryFrameColor')}`;
            }
        }
    }

    // Event Listeners
    settingsForm.addEventListener('input', (e) => {
        if (e.target.id !== 'userAvatarFile') {
            updateLivePreviews();
        }
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });

    // Carga inicial
    await loadSettings();
});
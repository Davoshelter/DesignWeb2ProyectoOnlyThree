document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    const settingsForm = document.querySelector('.settings-form');

    // --- BANDERAS Y ESTADO ---
    // Variable para rastrear si hay cambios sin guardar en el formulario.
    let isDirty = false;
    // Variable para almacenar la URL a la que el usuario intenta navegar.
    let targetUrl = null;

    // --- MODALES ---
    const unsavedModalEl = document.getElementById('unsavedChangesModal');
    const unsavedModal = unsavedModalEl ? new bootstrap.Modal(unsavedModalEl) : null;
    const resetButton = document.getElementById('resetButton');
    const resetModalEl = document.getElementById('resetConfirmModal');
    const resetModal = resetModalEl ? new bootstrap.Modal(resetModalEl) : null;
    const confirmResetButton = document.getElementById('confirmResetButton');


    // 1. PROTEGER RUTA
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Botón "Ver Mi Portfolio"
    const viewPortfolioButton = document.getElementById('view-portfolio-button');
    if(viewPortfolioButton) {
        viewPortfolioButton.href = `portfolio.html?userId=${user.id}`;
    }

    // Mapeo IDs HTML -> Columnas DB (Las columnas de tu SQL)
    const settingsMap = {
        'fontFamily': 'font_family',
        'baseFontSize': 'font_size',
        'primaryColor': 'primary_color',
        'fontColor': 'secondary_color',
        'userName': 'name',
        'userBio': 'about',
        'galleryFrameColor': 'gallery_frame_color',
        'galleryFrameWidth': 'gallery_frame_width',
        'galleryGap': 'gallery_gap',
        'galleryEffect': 'gallery_effect'
        // Se eliminan: profile_border_radius, profile_frame_color, profile_frame_width, profile_effect
    };

    // --- CARGAR DATOS ---
    async function loadSettings() {
        showLoader();
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        hideLoader();
        if (error) {
            console.error(error);
            return;
        }

        if (profile) {
            for (const [inputId, columnName] of Object.entries(settingsMap)) {
                const inputElement = document.getElementById(inputId);
                let value = profile[columnName];

                if (inputElement && value !== null) {
                    if (columnName === 'font_size') {
                        value = parseInt(value, 10) || 16;
                    }
                    inputElement.value = value;
                }
            }
             
            const previewAvatar = document.getElementById('preview-avatar');
            if (previewAvatar && profile.profile_picture_url) {
                previewAvatar.src = `${profile.profile_picture_url}?width=200&height=200&t=${Date.now()}`;
            }
        }
        updateLivePreviews();
        _updateControlStates();
        // Después de cargar todo, reseteamos el estado a 'limpio'.
        isDirty = false;
    }

    // --- GUARDAR DATOS ---
    async function saveSettings() {
        showLoader();
        const updates = { 
            updated_at: new Date(),
            profile_border_radius: null,
            profile_frame_color: null,
            profile_frame_width: null,
            profile_effect: null
        };

        for (const [inputId, columnName] of Object.entries(settingsMap)) {
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                let val = inputElement.value;
                if (columnName === 'font_size') {
                    val = parseInt(val, 10);
                }
                updates[columnName] = val;
            }
        }

        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        hideLoader();

        if (error) {
            showNotificationModal('Error', error.message, 'error');
        } else {
            // Marcamos el formulario como 'limpio' después de guardar.
            isDirty = false;
            const saveModalEl = document.getElementById('saveModal');
            if(saveModalEl) {
                const saveModal = new bootstrap.Modal(saveModalEl);
                saveModal.show();
            } else {
                showNotificationModal('Guardado', 'Cambios aplicados correctamente', 'success');
            }
        }
    }
    
    // --- LÓGICA DE RESET ---
    async function resetSettings() {
        // Aquí iría la llamada a una función de Supabase si tuvieras valores por defecto en el servidor.
        // Como no es el caso, simplemente volvemos a cargar los datos guardados.
        await loadSettings(); 
        isDirty = false; // Marcar como limpio
        resetModal.hide();
        showNotificationModal('Restaurado', 'La configuración se ha restaurado a la última versión guardada.', 'success');
    }

    // --- SUBIDA AVATAR ---
    const userAvatarFile = document.getElementById('userAvatarFile');
    if (userAvatarFile) {
        userAvatarFile.addEventListener('change', async (event) => {
            isDirty = true; // Subir un avatar también cuenta como un cambio.
            // ... (resto del código de subida de avatar)
        });
    }

    // --- ADVERTENCIA DE CAMBIOS SIN GUARDAR ---
    
    // 1. Advertencia del navegador (al cerrar pestaña, recargar, etc.)
    window.addEventListener('beforeunload', (event) => {
        if (isDirty) {
            event.preventDefault();
            // Requerido por la especificación de algunos navegadores
            event.returnValue = '';
            return '';
        }
    });

    // 2. Advertencia para navegación interna (clics en enlaces)
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        
        // Comprobar si se hizo clic en un enlace navegable y si hay cambios pendientes.
        const isNavigable = link && link.href && !link.href.endsWith('#') && !link.dataset.bsToggle;
        if (isDirty && isNavigable) {
            event.preventDefault(); // Detener la navegación.
            targetUrl = link.href; // Guardar la URL de destino.
            unsavedModal?.show(); // Mostrar el modal de confirmación.
        }
    });

    // Listener para el botón "Salir sin guardar" del modal.
    const confirmLeaveButton = document.getElementById('confirmLeaveButton');
    if (confirmLeaveButton) {
        confirmLeaveButton.addEventListener('click', () => {
            isDirty = false; // Permitir la navegación.
            window.location.href = targetUrl; // Redirigir a la URL guardada.
        });
    }


    // --- LÓGICA DE LA INTERFAZ ---

    function _updateControlStates() {
        const getVal = (id) => document.getElementById(id)?.value;
        const globalEffect = getVal('galleryEffect');
        const frameWidth = document.getElementById('galleryFrameWidth');
        const frameColor = document.getElementById('galleryFrameColor');
        
        if (frameWidth && frameColor) {
            const isDisabled = globalEffect && globalEffect !== 'none';
            frameWidth.disabled = isDisabled;
            frameColor.disabled = isDisabled;
        }
    }


    // --- VISTA PREVIA EN VIVO ---
    function updateLivePreviews() {
        const getVal = (id) => document.getElementById(id)?.value;
        const container = document.getElementById('live-preview-container');
        if (!container) return;

        _updateBadgeCounters(getVal);
        _updateGlobalPreview(getVal, container);
        _updateProfilePreview(getVal);
        _updateGalleryPreview(getVal);
    }

    function _updateBadgeCounters(getVal) {
        ['baseFontSizeValue', 'galleryFrameWidthValue', 'galleryGapValue']
            .forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                
                const inputId = id.replace('Value', '');
                const suffix = id.includes('Gap') ? 'rem' : (id.includes('Radius') ? '%' : 'px');
                el.textContent = getVal(inputId) + suffix;
            });
    }

    function _updateGlobalPreview(getVal, container) {
        container.style.fontFamily = getVal('fontFamily')?.replace(/'/g, "") || 'Arial';
        container.style.fontSize = `${getVal('baseFontSize')}px`;
        container.style.color = getVal('fontColor');
        container.style.setProperty('--electric-blue', getVal('primaryColor'));
    }

    function _updateProfilePreview(getVal) {
        const pvAvatar = document.getElementById('preview-avatar');
        const pvWrapper = document.getElementById('preview-wrapper');
        if(!pvAvatar || !pvWrapper) return;

        const borderRadius = '50%';
        pvAvatar.style.borderRadius = borderRadius;
        pvWrapper.style.borderRadius = borderRadius;
        
        pvWrapper.className = `d-inline-block position-relative mb-3`;
        pvAvatar.style.border = '';
        pvWrapper.style.border = '';

        const globalEffect = getVal('galleryEffect');
        
        if (globalEffect && globalEffect !== 'none') {
            pvWrapper.classList.add(globalEffect);
        } else {
            pvAvatar.style.border = `${getVal('galleryFrameWidth')}px solid ${getVal('galleryFrameColor')}`;
        }

        const pvName = document.getElementById('preview-name');
        if(pvName) pvName.textContent = getVal('userName');
        
        const pvBio = document.getElementById('preview-bio');
        if(pvBio) pvBio.textContent = getVal('userBio');
    }

    function _updateGalleryPreview(getVal) {
        const pvGallery = document.getElementById('preview-gallery');
        if(!pvGallery) return;

        pvGallery.style.gap = `${getVal('galleryGap')}rem`;
            
        if(pvGallery.children.length === 0) {
             pvGallery.innerHTML = `
                <div class="masonry-item"><img src="https://picsum.photos/200/300" style="width:100%; display:block; border-radius: 8px;"></div>
                <div class="masonry-item"><img src="https://picsum.photos/200/301" style="width:100%; display:block; border-radius: 8px;"></div>
             `;
        }

        const gEffect = getVal('galleryEffect');
        const items = pvGallery.querySelectorAll('.masonry-item');
        const images = pvGallery.querySelectorAll('img');

        items.forEach(item => {
            item.className = `masonry-item`;
            if (gEffect === 'fx-scanner') {
                item.classList.add('fx-scanner');
            }
            item.style.border = '';
        });

        images.forEach(img => {
            img.className = '';
            img.style.border = '';

            if (gEffect === 'fx-gradient' || gEffect === 'fx-glow') {
                 img.classList.add(gEffect);
            } else if (gEffect === 'none') {
                 img.style.border = `${getVal('galleryFrameWidth')}px solid ${getVal('galleryFrameColor')}`;
            }
        });
    }

    // --- EVENT LISTENERS ---

    settingsForm.addEventListener('input', (e) => {
        // Cualquier cambio en el formulario marca el estado como 'sucio'.
        isDirty = true;
        if (e.target.id !== 'userAvatarFile') {
            updateLivePreviews();
            _updateControlStates();
        }
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });

    if (resetButton) {
        resetButton.addEventListener('click', () => resetModal?.show());
    }
    if (confirmResetButton) {
        confirmResetButton.addEventListener('click', resetSettings);
    }

    // Carga inicial de los datos al entrar a la página.
    await loadSettings();
});
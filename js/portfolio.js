// js/portfolio.js

/**
 * Este archivo es el cerebro de la página 'portfolio.html'.
 * Es el script más complejo de la aplicación y se encarga de construir
 * dinámicamente la página del portfolio de un usuario específico.
 * 
 * Sus responsabilidades son:
 * 1.  Determinar qué portfolio mostrar a partir del parámetro 'userId' en la URL.
 * 2.  Cargar simultáneamente los datos del perfil y las imágenes de la galería desde Supabase.
 * 3.  Renderizar la información del perfil (nombre, bio, avatar).
 * 4.  Aplicar los estilos de diseño personalizados del usuario (colores, fuentes, efectos).
 * 5.  Construir la galería de imágenes con un layout tipo "masonry" (o mosaico).
 * 6.  Mostrar controles de edición (ej: 'Subir Foto', 'Diseñar') solo si el visitante es el dueño del portfolio.
 * 7.  Gestionar la visualización de imágenes en un modal de detalle.
 * 8.  Permitir al dueño del portfolio eliminar sus propias imágenes.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;

    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    // Guardamos referencias a los elementos clave de la página para manipularlos después.
    const root = document.documentElement; // Usado para variables CSS globales.
    const body = document.body;
    const profileImage = document.getElementById('profile-image');
    const userNameElement = document.getElementById('profile-name');
    const userBioElement = document.getElementById('profile-bio');
    const galleryGrid = document.querySelector('.masonry-grid');
    const pageTitle = document.querySelector('title');
    const mainContainer = document.querySelector('main.container');

    // --- CONFIGURACIÓN DEL MODAL DE DETALLE DE IMAGEN ---
    const imageDetailModalEl = document.getElementById('imageDetailModal');
    let imageDetailModal;
    if (imageDetailModalEl) {
        imageDetailModal = new bootstrap.Modal(imageDetailModalEl);
        
        // Preparamos un contenedor en el header del modal para el futuro botón de 'Eliminar'.
        const modalHeader = imageDetailModalEl.querySelector('.modal-header');
        if (modalHeader && !modalHeader.querySelector('.delete-btn-container')) {
            let deleteBtnContainer = document.createElement('div');
            deleteBtnContainer.className = 'delete-btn-container ms-auto me-2';
            modalHeader.insertBefore(deleteBtnContainer, modalHeader.querySelector('.btn-close'));
        }
    }
    const modalImage = document.getElementById('modal-image');
    const modalUserAvatar = document.getElementById('modal-user-avatar');
    const modalUserName = document.getElementById('modal-user-name');
    const modalImageDescription = document.getElementById('modal-image-description');

    // --- 1. DETERMINAR EL PERFIL A MOSTRAR ---
    const urlParams = new URLSearchParams(window.location.search);
    let profileId = urlParams.get('userId'); // Obtenemos el ID del usuario de la URL.
    
    // Obtenemos la información del usuario que está visitando la página (puede ser null si es un invitado).
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Si no se especifica un 'userId' en la URL...
    if (!profileId) {
        if (currentUser) {
            // ...y hay un usuario logueado, lo redirigimos a su propio portfolio.
            window.location.href = `portfolio.html?userId=${currentUser.id}`;
            return;
        } else {
            // ...y no hay nadie logueado, mostramos un error.
            displayError("No se ha especificado un perfil para mostrar.", true);
            return;
        }
    }
    
    showLoader();

    // --- 2. CARGA DE DATOS CONCURRENTE ---
    // Usamos `Promise.all` para lanzar las dos peticiones a Supabase (perfil y galería)
    // al mismo tiempo. Esto es más eficiente que hacerlas una después de la otra.
    const [profileResponse, galleryResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).single(),
        supabase.from('gallery_images').select('*').eq('profile_id', profileId).order('uploaded_at', { ascending: false })
    ]);

    const { data: profile, error: profileError } = profileResponse;
    const { data: galleryImages, error: galleryError } = galleryResponse;
    
    // Si no se encontró el perfil (o hubo un error), detenemos la ejecución y mostramos un mensaje.
    if (profileError || !profile) {
        hideLoader();
        console.error('Error al cargar perfil:', profileError);
        displayError(`El perfil solicitado no fue encontrado.`);
        return;
    }

    // --- ORQUESTACIÓN DE RENDERIZADO ---
    // Si los datos se cargaron correctamente, llamamos a las funciones que construirán la página.
    applyUserData(profile);                 // Pone el nombre, bio y avatar.
    applySettings(profile);                 // Aplica los estilos personalizados.
    renderGallery(profile, galleryImages || []); // Dibuja la galería de imágenes.
    checkAndDisplayEditControls(profile.id);  // Muestra botones de edición si corresponde.

    // --- FUNCIONES DE RENDERIZADO Y LÓGICA ---

    /** Muestra un mensaje de error en el contenedor principal de la página. */
    function displayError(message, showLogin = false) {
        if (mainContainer) {
            mainContainer.innerHTML = `
                <div class="glass-card p-5 text-center mt-5">
                    <h2 class="text-white fw-bold mb-3">Ups...</h2>
                    <p class="lead text-white-50 mb-4">${message}</p>
                    <a href="users.html" class="btn btn-primary">Ver Comunidad</a>
                    ${showLogin ? '<a href="login.html" class="btn btn-outline-light ms-2">Iniciar Sesión</a>' : ''}
                </div>`;
        }
    }

    /** Comprueba si el visitante es el dueño del perfil y muestra los botones de control. */
    function checkAndDisplayEditControls(profileUserId) {
        // Solo si hay un usuario logueado Y su ID coincide con el ID del perfil que se está viendo.
        if (currentUser && currentUser.id === profileUserId) {
            const header = userNameElement?.parentElement;
            if (!header || document.getElementById('owner-controls')) return; // Evita duplicados.

            const controlsDiv = document.createElement('div');
            controlsDiv.id = 'owner-controls';
            controlsDiv.className = 'mt-4 d-flex gap-3 justify-content-center flex-wrap fade-in-up';
            controlsDiv.innerHTML = `
                <a href="settings.html" class="btn btn-outline-light px-4">
                    <i class="bi bi-pencil-fill me-2"></i> Diseñar
                </a>
                <a href="add-image.html" class="btn btn-primary px-4 glow-on-hover">
                    <i class="bi bi-plus-lg me-2"></i> Subir Foto
                </a>
            `;
            header.appendChild(controlsDiv);
        }
    }

    /** Aplica los datos del perfil (nombre, bio, avatar) a la cabecera de la página. */
    function applyUserData(profileData) {
        if (pageTitle) pageTitle.textContent = `${profileData.name} | OwnDesign`;
        if (userNameElement) userNameElement.textContent = profileData.name;
        if (userBioElement) userBioElement.textContent = profileData.about || 'Creador de contenido';
        
        if (profileImage) {
            const avatarUrl = profileData.profile_picture_url 
                ? `${profileData.profile_picture_url}?width=400&height=400` 
                : `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profileData.name)}`;
            profileImage.src = avatarUrl; 
        }
    }

    /** Aplica los estilos de diseño personalizados guardados en el perfil. */
    function applySettings(p) {
        // Aplica fuentes y variables CSS globales
        body.style.fontFamily = p.font_family ? p.font_family.replace(/"/g, "'") : "'Arial', sans-serif";
        root.style.fontSize = (p.font_size || 16) + 'px';
        root.style.setProperty('--electric-blue', p.primary_color || '#8A2BE2');

        // SOLUCIÓN DEFINITIVA: Aplicar el color de texto con alta prioridad.
        // Usamos `setProperty` con el flag 'important' para sobreescribir las clases
        // '!important' de Bootstrap, como '.text-white'.
        if (p.secondary_color) {
            const nameElement = document.getElementById('profile-name');
            const bioElement = document.getElementById('profile-bio');

            // Aplicamos el color con '!important' para asegurar la máxima prioridad.
            if (nameElement) nameElement.style.setProperty('color', p.secondary_color, 'important');
            if (bioElement) bioElement.style.setProperty('color', p.secondary_color, 'important');
            
            // También lo aplicamos al body, para que otros textos sin clases conflictivas lo hereden.
            // Esto incluye la descripción de la imagen en el modal.
            body.style.color = p.secondary_color;
        }

        // Aplica los efectos y bordes al avatar del perfil.
        const profileWrapper = document.getElementById('profile-wrapper');
        if (profileImage && profileWrapper) {
            profileWrapper.className = 'd-inline-block position-relative rounded-circle';
            profileImage.style.border = '';
            const globalEffect = p.gallery_effect;
            if (globalEffect && globalEffect !== 'none') {
                profileWrapper.classList.add(globalEffect);
            } else {
                profileImage.style.border = `${p.gallery_frame_width || 0}px solid ${p.gallery_frame_color || 'transparent'}`;
            }
        }
    }

    /** Renderiza la galería de imágenes utilizando la librería Masonry. */
    function renderGallery(profileData, images) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';

        if (images.length === 0) {
            galleryGrid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-white-50 mt-3">Este creador aún no tiene imágenes en su portfolio.</p></div>`;
            hideLoader(); 
            return;
        }
        
        images.forEach(imgData => {
            const item = document.createElement('div');
            item.className = 'masonry-item fade-in-up';
            item.style.cursor = 'pointer';

            const imgEl = document.createElement('img');
            imgEl.src = `${imgData.image_url}?width=600&quality=80`;
            imgEl.alt = imgData.title || 'Imagen del portfolio';
            imgEl.loading = 'lazy'; // Carga diferida para mejorar el rendimiento.
            
            // Aplicar efectos y bordes a cada imagen de la galería.
            const gEffect = profileData.gallery_effect;
            if (gEffect === 'fx-glow' || gEffect === 'fx-gradient') {
                imgEl.classList.add(gEffect);
            } else if (gEffect === 'fx-scanner') {
                item.classList.add(gEffect);
            } else {
                imgEl.style.border = `${profileData.gallery_frame_width || 0}px solid ${profileData.gallery_frame_color || 'var(--border-color)'}`;
            }
            
            item.addEventListener('click', () => openModal(imgData, profileData));
            item.appendChild(imgEl);
            galleryGrid.appendChild(item);
        });

        // --- INTEGRACIÓN CON LIBRERÍAS EXTERNAS ---
        // Masonry no puede calcular el layout correctamente hasta que todas las imágenes se han cargado.
        const imgLoad = imagesLoaded(galleryGrid);
        
        imgLoad.on('done', function() {
            // Una vez que TODAS las imágenes están cargadas...
            hideLoader(); 
            // ...inicializamos Masonry para que organice la grilla.
            new Masonry(galleryGrid, {
                itemSelector: '.masonry-item',
                percentPosition: true,
                gutter: 16 
            });
        });
    }

    /** Abre el modal de detalle con la información de una imagen específica. */
    function openModal(imgData, profileData) {
        if (!imageDetailModal) return;

        modalImage.src = imgData.image_url;
        modalUserAvatar.src = profileImage.src; // Reutilizamos la imagen del perfil ya cargada.
        modalUserName.textContent = profileData.name;
        modalImageDescription.textContent = imgData.description || '';
        
        // Lógica para mostrar el botón de eliminar SOLO al dueño.
        const deleteBtnContainer = imageDetailModalEl.querySelector('.delete-btn-container');
        if (deleteBtnContainer) {
            deleteBtnContainer.innerHTML = ''; 
            if (currentUser && currentUser.id === profileData.id) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-outline-danger btn-sm d-flex align-items-center gap-2';
                deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i> Eliminar';
                
                // Al hacer clic, mostramos un segundo modal de confirmación.
                deleteBtn.onclick = () => {
                    const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
                    const confirmBtn = document.getElementById('confirmDeleteBtn');
                    
                    confirmBtn.onclick = async () => {
                        confirmModal.hide(); 
                        await deleteImage(imgData, deleteBtn);
                    };
                    confirmModal.show();
                };
                deleteBtnContainer.appendChild(deleteBtn);
            }
        }
        imageDetailModal.show();
    }

    /** Proceso para eliminar una imagen (requiere 2 pasos en Supabase). */
    async function deleteImage(imgData, btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Borrando...';

        try {
            // PASO 1: Eliminar el archivo físico de Supabase Storage.
            // Extraemos el 'path' del archivo desde su URL pública.
            const urlObj = new URL(imgData.image_url);
            const pathParts = urlObj.pathname.split('/imagenes/');
            if (pathParts.length > 1) {
                const storagePath = pathParts[1]; 
                await supabase.storage.from('imagenes').remove([storagePath]);
            }

            // PASO 2: Eliminar el registro de la imagen de la base de datos ('gallery_images').
            const { error: dbError } = await supabase
                .from('gallery_images')
                .delete()
                .eq('id', imgData.id);

            if (dbError) throw dbError;

            imageDetailModal.hide();
            showNotificationModal('Imagen eliminada', 'La imagen ha sido borrada de tu portfolio.', 'success');
            
            // Recargamos la página para reflejar el cambio.
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error("Error al eliminar la imagen:", error);
            showNotificationModal('Error', 'No se pudo eliminar la imagen.', 'error');
            btnElement.disabled = false;
            btnElement.innerHTML = '<i class="bi bi-trash-fill"></i> Eliminar';
        }
    }

    // Lógica para el botón "Scroll to Top".
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) { /* ... */ }
});
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;

    // --- SELECTORES ---
    const root = document.documentElement;
    const body = document.body;
    const profileImage = document.getElementById('profile-image');
    const userNameElement = document.getElementById('profile-name');
    const userBioElement = document.getElementById('profile-bio');
    const galleryGrid = document.querySelector('.masonry-grid');
    const pageTitle = document.querySelector('title');
    const mainContainer = document.querySelector('main.container');

    // --- MODAL ---
    const imageDetailModalEl = document.getElementById('imageDetailModal');
    // Verificamos si existe el modal antes de intentar iniciarlo (para evitar errores en otras páginas)
    let imageDetailModal;
    if (imageDetailModalEl) {
        imageDetailModal = new bootstrap.Modal(imageDetailModalEl);
        
        // Preparar botón de eliminar en el modal
        const modalHeader = imageDetailModalEl.querySelector('.modal-header');
        if (modalHeader && !modalHeader.querySelector('.delete-btn-container')) {
            let deleteBtnContainer = document.createElement('div');
            deleteBtnContainer.className = 'delete-btn-container ms-auto me-2'; 
            modalHeader.insertBefore(deleteBtnContainer, modalHeader.querySelector('.btn-close'));
        }
    }
    
    // Elementos del modal
    const modalImage = document.getElementById('modal-image');
    const modalUserAvatar = document.getElementById('modal-user-avatar');
    const modalUserName = document.getElementById('modal-user-name');
    const modalImageDescription = document.getElementById('modal-image-description');

    // 1. OBTENER ID y USUARIO ACTUAL
    const urlParams = new URLSearchParams(window.location.search);
    let profileId = urlParams.get('userId');
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // SOLUCIÓN: Si no hay ID en la URL...
    if (!profileId) {
        if (currentUser) {
            // ...pero estás logueado, redirigir a TU portfolio
            window.location.href = `portfolio.html?userId=${currentUser.id}`;
            return;
        } else {
            // ...y no estás logueado, error
            displayError("Usuario no especificado.", true);
            return;
        }
    }
    
    showLoader();

    // 2. CARGAR DATOS (Usando tu columna 'uploaded_at')
    const [profileResponse, galleryResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).single(),
        supabase.from('gallery_images')
            .select('*')
            .eq('profile_id', profileId)
            .order('uploaded_at', { ascending: false }) 
    ]);

    const { data: profile, error: profileError } = profileResponse;
    const { data: galleryImages, error: galleryError } = galleryResponse;
    
    // El loader se oculta dentro de renderGallery, después de que imagesLoaded termina.

    // Si hay un error, ocultamos el loader y mostramos el mensaje.
    if (profileError || !profile) {
        hideLoader(); 
        console.error('Error:', profileError);
        displayError(`Usuario no encontrado.`);
        return;
    }

    // 3. RENDERIZAR
    applyUserData(profile);
    applySettings(profile);
    renderGallery(profile, galleryImages || []);
    checkAndDisplayEditControls(profile.id);

    // --- FUNCIONES ---

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

    function checkAndDisplayEditControls(profileUserId) {
        if (currentUser && currentUser.id === profileUserId) {
            const header = userNameElement?.parentElement;
            if (!header || document.getElementById('owner-controls')) return;

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
            
            // Ocultar botón estático si existe
            const staticBtn = header.querySelector('a[href="settings.html"]');
            if(staticBtn) staticBtn.style.display = 'none';
            
            header.appendChild(controlsDiv);
        }
    }

    function applyUserData(profileData) {
        if (pageTitle) pageTitle.textContent = `${profileData.name} | OwnDesign`;
        if (userNameElement) userNameElement.textContent = profileData.name;
        // Fallback: Si no hay 'about', usa 'title' (que vi en tu SQL)
        if (userBioElement) userBioElement.textContent = profileData.about || profileData.title || 'Creador de contenido';
        
        if (profileImage) {
            const avatarUrl = profileData.profile_picture_url ? `${profileData.profile_picture_url}?width=400&height=400` : 
                `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profileData.name)}`;
            profileImage.src = avatarUrl; 
        }
    }

    function applySettings(p) {
        // Colores y Fuentes
        if (p.secondary_color) {
            body.style.color = p.secondary_color;
            document.querySelectorAll('h1, h2, h3, p').forEach(el => el.style.color = p.secondary_color);
        }
        const font = p.font_family ? p.font_family.replace(/"/g, "'") : "'Arial', sans-serif";
        body.style.fontFamily = font;
        let fSize = p.font_size || 16; // Usar número por defecto
        if (!fSize.toString().includes('px')) fSize += 'px';
        root.style.fontSize = fSize;
        root.style.setProperty('--electric-blue', p.primary_color || '#8A2BE2');

        // === APLICAR EFECTOS GLOBALES AL PERFIL ===
        const profileWrapper = document.getElementById('profile-wrapper');

        if (profileImage && profileWrapper) {
            // 1. Redondeo fijo a 50% para un círculo perfecto.
            const borderRadius = '50%';
            profileImage.style.borderRadius = borderRadius;
            profileWrapper.style.borderRadius = borderRadius;
            
            // 2. Limpiar clases y estilos previos
            profileWrapper.classList.remove('fx-glow', 'fx-gradient', 'fx-scanner');
            profileWrapper.style.border = '';
            profileImage.style.border = ''; 

            // 3. Aplicar efecto global o borde estándar global
            const globalEffect = p.gallery_effect; // Se usa el efecto de galería como global
            if (globalEffect && globalEffect !== 'none') {
                // El efecto va al contenedor (wrapper)
                profileWrapper.classList.add(globalEffect);
            } else {
                // Sin efecto especial: Borde normal en la imagen usando valores de galería
                const frameWidth = p.gallery_frame_width || 0;
                const frameColor = p.gallery_frame_color || 'transparent';
                profileImage.style.border = `${frameWidth}px solid ${frameColor}`;
            }
        }
    }

    function renderGallery(profileData, images) {
        if (!galleryGrid) return;
        galleryGrid.innerHTML = '';

        if (images.length === 0) {
            galleryGrid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-white-50 mt-3">Aún no hay imágenes.</p></div>`;
            hideLoader(); // Ocultar si no hay imágenes
            return;
        }

        const userAvatar = profileImage.src;
        const gEffect = profileData.gallery_effect;

        // 1. Crear y añadir todos los elementos a la grilla
        images.forEach(imgData => {
            const item = document.createElement('div');
            item.className = 'masonry-item fade-in-up';
            item.style.cursor = 'pointer';

            const imgEl = document.createElement('img');
            imgEl.src = `${imgData.image_url}?width=600&quality=80`;
            imgEl.alt = imgData.title || 'Imagen';
            imgEl.loading = 'lazy';
            imgEl.className = 'shadow-lg'; // Clase base para la sombra

            // Lógica de estilos y efectos (CORREGIDA)
            // Se aplica a la IMAGEN, no al 'item'
            if (gEffect === 'fx-glow' || gEffect === 'fx-gradient') {
                imgEl.classList.add(gEffect);
                imgEl.style.border = ''; 
            } else if (gEffect === 'fx-scanner') {
                // El efecto Scanner es especial, se aplica al contenedor para que funcione el 'overflow:hidden'
                item.classList.add(gEffect);
                imgEl.style.border = 'none';
            }
            else { // Borde estándar o sin efecto
                const frameColor = profileData.gallery_frame_color || 'var(--border-color)';
                const frameWidth = profileData.gallery_frame_width || 0;
                imgEl.style.border = `${frameWidth}px solid ${frameColor}`;
            }
            
            item.addEventListener('click', () => {
                openModal(imgData, profileData, userAvatar);
            });

            item.appendChild(imgEl);
            galleryGrid.appendChild(item);
        });

        // 2. Esperar a que todas las imágenes se carguen
        const imgLoad = imagesLoaded(galleryGrid);
        
        imgLoad.on('done', function() {
            hideLoader(); // Ocultar loader aquí
            new Masonry(galleryGrid, {
                itemSelector: '.masonry-item',
                percentPosition: true,
                gutter: 16 // Un poco más de espacio
            });
        });

        imgLoad.on('fail', function() {
            hideLoader(); // Ocultar loader también en caso de error
            console.error("Una o más imágenes no pudieron cargarse.");
        });
    }

    function openModal(imgData, profileData, avatarUrl) {
        if (!imageDetailModal) return;

        modalImage.src = imgData.image_url;
        modalUserAvatar.src = avatarUrl;
        modalUserName.textContent = profileData.name;
        modalImageDescription.textContent = imgData.description || '';
        
        const deleteBtnContainer = imageDetailModalEl.querySelector('.delete-btn-container');
        if (deleteBtnContainer) {
            deleteBtnContainer.innerHTML = ''; // Limpiar
            
            // Si soy el dueño, mostrar botón borrar
            if (currentUser && currentUser.id === profileData.id) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-outline--danger btn-sm d-flex align-items-center gap-2';
                deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i> Eliminar';
                deleteBtn.onclick = () => deleteImage(imgData, deleteBtn);
                deleteBtnContainer.appendChild(deleteBtn);
            }
        }

        imageDetailModal.show();
    }

    async function deleteImage(imgData, btnElement) {
        if(!confirm('¿Estás seguro de eliminar esta imagen?')) return;

        btnElement.disabled = true;
        btnElement.innerHTML = 'Borrando...';

        try {
            // 1. Borrar de Storage
            const urlObj = new URL(imgData.image_url);
            const pathParts = urlObj.pathname.split('/imagenes/');
            
            if (pathParts.length > 1) {
                const storagePath = pathParts[1]; 
                await supabase.storage.from('imagenes').remove([storagePath]);
            }

            // 2. Borrar de DB
            const { error: dbError } = await supabase
                .from('gallery_images')
                .delete()
                .eq('id', imgData.id);

            if (dbError) throw dbError;

            imageDetailModal.hide();
            showNotificationModal('Imagen eliminada', 'Se borró correctamente.', 'success');
            
            // Recargar para actualizar la grilla
            setTimeout(() => window.location.reload(), 500);

        } catch (error) {
            console.error(error);
            showNotificationModal('Error', 'No se pudo eliminar.', 'error');
            btnElement.disabled = false;
            btnElement.innerHTML = 'Error';
        }
    }

    // --- SCROLL TO TOP BUTTON LOGIC ---
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    if (scrollToTopBtn) {
        // Show/Hide button on scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) { // Show after scrolling 300px
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        });

        // Scroll to top on click
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});
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
    let imageDetailModal;
    if (imageDetailModalEl) {
        imageDetailModal = new bootstrap.Modal(imageDetailModalEl);
        
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

    const urlParams = new URLSearchParams(window.location.search);
    let profileId = urlParams.get('userId');
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!profileId) {
        if (currentUser) {
            window.location.href = `portfolio.html?userId=${currentUser.id}`;
            return;
        } else {
            displayError("Usuario no especificado.", true);
            return;
        }
    }
    
    showLoader();

    const [profileResponse, galleryResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).single(),
        supabase.from('gallery_images')
            .select('*')
            .eq('profile_id', profileId)
            .order('uploaded_at', { ascending: false }) 
    ]);

    const { data: profile, error: profileError } = profileResponse;
    const { data: galleryImages, error: galleryError } = galleryResponse;
    
    if (profileError || !profile) {
        hideLoader(); 
        console.error('Error:', profileError);
        displayError(`Usuario no encontrado.`);
        return;
    }

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
            
            const staticBtn = header.querySelector('a[href="settings.html"]');
            if(staticBtn) staticBtn.style.display = 'none';
            
            header.appendChild(controlsDiv);
        }
    }

    function applyUserData(profileData) {
        if (pageTitle) pageTitle.textContent = `${profileData.name} | OwnDesign`;
        if (userNameElement) userNameElement.textContent = profileData.name;
        if (userBioElement) userBioElement.textContent = profileData.about || profileData.title || 'Creador de contenido';
        
        if (profileImage) {
            const avatarUrl = profileData.profile_picture_url ? `${profileData.profile_picture_url}?width=400&height=400` : 
                `https://avatar.iran.liara.run/public/boy?username=${encodeURIComponent(profileData.name)}`;
            profileImage.src = avatarUrl; 
        }
    }

    function applySettings(p) {
        if (p.secondary_color) {
            body.style.color = p.secondary_color;
            document.querySelectorAll('h1, h2, h3, p').forEach(el => el.style.color = p.secondary_color);
        }
        const font = p.font_family ? p.font_family.replace(/"/g, "'") : "'Arial', sans-serif";
        body.style.fontFamily = font;
        let fSize = p.font_size || 16; 
        if (!fSize.toString().includes('px')) fSize += 'px';
        root.style.fontSize = fSize;
        root.style.setProperty('--electric-blue', p.primary_color || '#8A2BE2');

        const profileWrapper = document.getElementById('profile-wrapper');

        if (profileImage && profileWrapper) {
            const borderRadius = '50%';
            profileImage.style.borderRadius = borderRadius;
            profileWrapper.style.borderRadius = borderRadius;
            profileWrapper.classList.remove('fx-glow', 'fx-gradient', 'fx-scanner');
            profileWrapper.style.border = '';
            profileImage.style.border = ''; 

            const globalEffect = p.gallery_effect; 
            if (globalEffect && globalEffect !== 'none') {
                profileWrapper.classList.add(globalEffect);
            } else {
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
            hideLoader(); 
            return;
        }

        const userAvatar = profileImage.src;
        const gEffect = profileData.gallery_effect;

        images.forEach(imgData => {
            const item = document.createElement('div');
            item.className = 'masonry-item fade-in-up';
            item.style.cursor = 'pointer';

            const imgEl = document.createElement('img');
            imgEl.src = `${imgData.image_url}?width=600&quality=80`;
            imgEl.alt = imgData.title || 'Imagen';
            imgEl.loading = 'lazy';
            imgEl.className = 'shadow-lg'; 

            if (gEffect === 'fx-glow' || gEffect === 'fx-gradient') {
                imgEl.classList.add(gEffect);
                imgEl.style.border = ''; 
            } else if (gEffect === 'fx-scanner') {
                item.classList.add(gEffect);
                imgEl.style.border = 'none';
            }
            else { 
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

        const imgLoad = imagesLoaded(galleryGrid);
        
        imgLoad.on('done', function() {
            hideLoader(); 
            new Masonry(galleryGrid, {
                itemSelector: '.masonry-item',
                percentPosition: true,
                gutter: 16 
            });
        });

        imgLoad.on('fail', function() {
            hideLoader(); 
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
            deleteBtnContainer.innerHTML = ''; 
            
            if (currentUser && currentUser.id === profileData.id) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-outline--danger btn-sm d-flex align-items-center gap-2';
                deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i> Eliminar';
                
                // INTEGRACIÓN DE MODAL DE CONFIRMACIÓN
                deleteBtn.onclick = () => {
                    const confirmModalEl = document.getElementById('confirmDeleteModal');
                    const confirmModal = new bootstrap.Modal(confirmModalEl);
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

    async function deleteImage(imgData, btnElement) {
        // Se eliminó el confirm() nativo aquí
        btnElement.disabled = true;
        btnElement.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Borrando...';

        try {
            const urlObj = new URL(imgData.image_url);
            const pathParts = urlObj.pathname.split('/imagenes/');
            
            if (pathParts.length > 1) {
                const storagePath = pathParts[1]; 
                await supabase.storage.from('imagenes').remove([storagePath]);
            }

            const { error: dbError } = await supabase
                .from('gallery_images')
                .delete()
                .eq('id', imgData.id);

            if (dbError) throw dbError;

            imageDetailModal.hide();
            showNotificationModal('Imagen eliminada', 'Se borró correctamente.', 'success');
            
            setTimeout(() => window.location.reload(), 1000);

        } catch (error) {
            console.error(error);
            showNotificationModal('Error', 'No se pudo eliminar.', 'error');
            btnElement.disabled = false;
            btnElement.innerHTML = '<i class="bi bi-trash-fill"></i> Error';
        }
    }

    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) { 
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
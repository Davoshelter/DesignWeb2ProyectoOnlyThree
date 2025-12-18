/**
 * Este archivo gestiona la página de configuración (settings.html).
 * Sus responsabilidades principales son:
 * 1.  Proteger la ruta: Solo permite el acceso a usuarios autenticados.
 * 2.  Cargar y mostrar la configuración actual del perfil del usuario.
 * 3.  Permitir al usuario modificar su perfil (datos y foto).
 * 4.  Actualizar la configuración en la base de datos de Supabase.
 * 5.  Proporcionar una vista previa en tiempo real de los cambios de diseño.
 * 6.  Advertir al usuario si intenta salir sin guardar los cambios.
 * 7.  Manejar la subida y actualización de la foto de perfil.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Inicialización de variables y obtención del cliente de Supabase.
    const supabase = window.supabaseClient;
    const settingsForm = document.querySelector('.settings-form');

    // --- BANDERAS Y ESTADO GLOBAL DEL COMPONENTE ---
    // 'isDirty' actúa como una bandera (flag) que nos dice si el formulario tiene cambios sin guardar.
    // Se activa cuando el usuario modifica cualquier campo.
    let isDirty = false;
    // 'targetUrl' almacena temporalmente la URL a la que el usuario quiere ir
    // cuando es interrumpido por el aviso de "cambios sin guardar".
    let targetUrl = null;

    // --- MANEJO DE MODALES DE BOOTSTRAP ---
    const unsavedModalEl = document.getElementById('unsavedChangesModal');
    const unsavedModal = unsavedModalEl ? new bootstrap.Modal(unsavedModalEl) : null;
    const resetModalEl = document.getElementById('resetConfirmModal');
    const resetModal = resetModalEl ? new bootstrap.Modal(resetModalEl) : null;
    const confirmResetButton = document.getElementById('confirmResetButton');


    // 1. --- PROTECCIÓN DE LA RUTA ---
    // Antes de hacer nada, verificamos si hay un usuario con sesión activa.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        // Si no hay usuario o hay un error, lo redirigimos inmediatamente a la página de login.
        // Esto previene que usuarios no autenticados vean o interactúen con la página de configuración.
        window.location.href = 'login.html';
        return; // Detenemos la ejecución del script.
    }

    // Si el usuario está autenticado, personalizamos el botón "Ver Mi Portfolio" para que apunte a su URL correcta.
    const viewPortfolioButton = document.getElementById('view-portfolio-button');
    if(viewPortfolioButton) {
        viewPortfolioButton.href = `portfolio.html?userId=${user.id}`;
    }

    // --- MAPEO DE CONFIGURACIÓN: HTML -> BASE DE DATOS ---
    // Este objeto es crucial. Actúa como un "traductor" entre los IDs de los
    // campos del formulario HTML y los nombres de las columnas en la tabla 'profiles' de Supabase.
    // Facilita enormemente la carga y guardado de datos, haciendo el código más limpio y escalable.
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
    };

    // --- FUNCIÓN PARA CARGAR LA CONFIGURACIÓN DEL USUARIO ---
    async function loadSettings() {
        showLoader(); // Feedback visual para el usuario.
        
        // Consultamos la tabla 'profiles' para obtener la fila que corresponde al ID del usuario actual.
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single(); // .single() nos devuelve un objeto en lugar de un array.

        hideLoader();
        if (error) {
            console.error("Error al cargar el perfil:", error);
            return;
        }

        // Si se encuentra el perfil, recorremos nuestro 'settingsMap' para poblar el formulario.
        if (profile) {
            for (const [inputId, columnName] of Object.entries(settingsMap)) {
                const inputElement = document.getElementById(inputId);
                let value = profile[columnName];

                if (inputElement && value !== null) {
                    // Tratamiento especial para el tamaño de fuente.
                    if (columnName === 'font_size') {
                        value = parseInt(value, 10) || 16;
                    }
                    inputElement.value = value;
                }
            }
             
            // Cargamos la imagen de perfil en la vista previa.
            const previewAvatar = document.getElementById('preview-avatar');
            if (previewAvatar && profile.profile_picture_url) {
                // Añadimos un timestamp a la URL para evitar problemas de caché del navegador.
                previewAvatar.src = `${profile.profile_picture_url}?t=${Date.now()}`;
            }

            // CORRECCIÓN: Actualizamos directamente la vista previa del nombre y la bio al cargar.
            // Esto asegura que la vista previa sea correcta desde el inicio.
            const pvName = document.getElementById('preview-name');
            const pvBio = document.getElementById('preview-bio');
            if (pvName) pvName.textContent = profile.name || 'Tu Nombre';
            if (pvBio) pvBio.textContent = profile.about || 'Tu biografía...';
        }
        
        // Una vez cargados los datos, actualizamos la vista previa y el estado de los controles.
        updateLivePreviews();
        _updateControlStates();
        // Crucial: Después de cargar, reseteamos el estado a 'limpio' (sin cambios pendientes).
        isDirty = false;
    }

    // --- FUNCIÓN PARA GUARDAR LA CONFIGURACIÓN ---
    async function saveSettings() {
        showLoader();
        
        // Creamos un objeto 'updates' que contendrá todos los nuevos valores a guardar.
        const updates = { updated_at: new Date() }; // Siempre actualizamos la fecha de modificación.

        // Usando el 'settingsMap', recogemos los valores actuales de cada campo del formulario.
        for (const [inputId, columnName] of Object.entries(settingsMap)) {
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                updates[columnName] = inputElement.value;
            }
        }

        // Realizamos la operación de 'update' en Supabase.
        const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
        hideLoader();

        if (error) {
            showNotificationModal('Error', error.message, 'error');
        } else {
            // Si el guardado es exitoso, marcamos el formulario como 'limpio'.
            isDirty = false;
            // Mostramos un modal de confirmación.
            const saveModalEl = document.getElementById('saveModal');
            if(saveModalEl) {
                new bootstrap.Modal(saveModalEl).show();
            } else {
                showNotificationModal('Guardado', 'Cambios aplicados correctamente', 'success');
            }
        }
    }
    
    // --- LÓGICA PARA SUBIR LA FOTO DE PERFIL ---
    const userAvatarFile = document.getElementById('userAvatarFile');
    if (userAvatarFile) {
        // Escuchamos el evento 'change', que se dispara cuando el usuario selecciona un archivo.
        userAvatarFile.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return; // Si el usuario cancela la selección, no hacemos nada.

            isDirty = true; // Subir un archivo también se considera un cambio.
            showLoader();

            // 1. CREAR UN NOMBRE DE ARCHIVO ÚNICO
            // Es una buena práctica crear un nombre único para evitar que un usuario sobreescriba
            // el archivo de otro. Usamos el ID del usuario + un timestamp.
            const fileExtension = file.name.split('.').pop();
            // CORRECCIÓN: La ruta debe apuntar a la carpeta 'avatars' dentro del bucket.
            const filePath = `avatars/${user.id}-${Date.now()}.${fileExtension}`;

            try {
                // 2. SUBIR LA IMAGEN A SUPABASE STORAGE
                // CORRECCIÓN: El bucket correcto es 'imagenes'.
                const { error: uploadError } = await supabase.storage
                    .from('imagenes')
                    .upload(filePath, file);

                if (uploadError) throw uploadError; // Si hay un error, saltamos al catch.

                // 3. OBTENER LA URL PÚBLICA
                // Una vez subido, necesitamos la URL pública para guardarla en la base de datos y mostrar la imagen.
                const { data: urlData } = supabase.storage
                    .from('imagenes')
                    .getPublicUrl(filePath);
                
                if (!urlData.publicUrl) throw new Error("No se pudo obtener la URL pública.");
                const publicUrl = urlData.publicUrl;

                // 4. ACTUALIZAR LA TABLA 'profiles'
                // Guardamos la URL pública en la columna 'profile_picture_url' del usuario.
                const { error: dbError } = await supabase
                    .from('profiles')
                    .update({ profile_picture_url: publicUrl })
                    .eq('id', user.id);

                if (dbError) throw dbError;
                
                // 5. ACTUALIZAR VISTA PREVIA
                // Mostramos la nueva imagen inmediatamente en la UI para dar feedback instantáneo.
                const previewAvatar = document.getElementById('preview-avatar');
                if (previewAvatar) {
                    previewAvatar.src = `${publicUrl}?t=${Date.now()}`;
                }
                
                showNotificationModal('Éxito', 'Tu foto de perfil ha sido actualizada. ¡No olvides guardar los cambios!', 'success');

            } catch (error) {
                console.error('Error al subir avatar:', error);
                showNotificationModal('Error', 'No se pudo actualizar la foto de perfil. ' + error.message, 'error');
            } finally {
                // Independientemente del resultado, ocultamos el loader.
                hideLoader();
                event.target.value = ''; // Limpiamos el input para poder seleccionar el mismo archivo otra vez.
            }
        });
    }

    // --- SISTEMA DE ADVERTENCIA DE "CAMBIOS SIN GUARDAR" ---
    
    // 1. Advertencia nativa del navegador (al cerrar pestaña, recargar).
    window.addEventListener('beforeunload', (event) => {
        if (isDirty) {
            event.preventDefault();
            // Esto es requerido por los navegadores para mostrar su propio diálogo de confirmación.
            event.returnValue = '';
            return '';
        }
    });

    // 2. Advertencia para navegación interna (clics en enlaces de la página).
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        
        // Verificamos si se hizo clic en un enlace válido Y si hay cambios pendientes.
        const isNavigable = link && link.href && !link.href.endsWith('#') && !link.dataset.bsToggle;
        if (isDirty && isNavigable) {
            event.preventDefault(); // Detenemos la navegación.
            targetUrl = link.href;  // Guardamos la URL a la que se quería ir.
            unsavedModal?.show();   // Mostramos nuestro modal de Bootstrap personalizado.
        }
    });

    // Listener para el botón "Salir sin guardar" de nuestro modal.
    const confirmLeaveButton = document.getElementById('confirmLeaveButton');
    if (confirmLeaveButton) {
        confirmLeaveButton.addEventListener('click', () => {
            isDirty = false; // Desactivamos la bandera para permitir la salida.
            window.location.href = targetUrl; // Redirigimos a la URL que habíamos guardado.
        });
    }

    // --- LÓGICA DE LA INTERFAZ DE USUARIO (UI) ---

    // Habilita o deshabilita controles dependiendo de otras selecciones.
    function _updateControlStates() {
        const globalEffect = document.getElementById('galleryEffect')?.value;
        const frameWidth = document.getElementById('galleryFrameWidth');
        const frameColor = document.getElementById('galleryFrameColor');
        
        // Si hay un "Efecto Especial" seleccionado, deshabilitamos los controles de borde estándar.
        if (frameWidth && frameColor) {
            const isDisabled = globalEffect && globalEffect !== 'none';
            frameWidth.disabled = isDisabled;
            frameColor.disabled = isDisabled;
        }
    }


    // --- LÓGICA DE VISTA PREVIA EN VIVO ---
    // Esta función orquesta la actualización de todas las partes de la vista previa.
    function updateLivePreviews() {
        const getVal = (id) => document.getElementById(id)?.value;
        const container = document.getElementById('live-preview-container');
        if (!container) return;

        // Actualizamos los contadores (badges), el estilo global, el perfil y la galería.
        _updateBadgeCounters(getVal);
        _updateGlobalPreview(getVal, container);
        _updateProfilePreview(getVal);
        _updateGalleryPreview(getVal);
    }
    
    // El resto de funciones (_updateBadgeCounters, _updateGlobalPreview, etc.) son auxiliares
    // que simplemente toman los valores del formulario y los aplican como estilos CSS
    // a los elementos de la vista previa.

    function _updateBadgeCounters(getVal) { /* ... */ }
    function _updateGlobalPreview(getVal, container) {
        // Aplicar estilos globales al contenedor de la vista previa
        container.style.fontFamily = getVal('fontFamily')?.replace(/'/g, "") || 'Arial';
        container.style.fontSize = `${getVal('baseFontSize')}px`;
        container.style.setProperty('--electric-blue', getVal('primaryColor'));

        // CORRECCIÓN: Aplicar el color de fuente directamente a los elementos de texto.
        // Esto es más robusto que aplicarlo al contenedor y esperar que se herede,
        // especialmente si los elementos tienen sus propias reglas de color en el CSS.
        const fontColor = getVal('fontColor');
        const pvName = document.getElementById('preview-name');
        const pvBio = document.getElementById('preview-bio');

        if (pvName) pvName.style.color = fontColor;
        if (pvBio) pvBio.style.color = fontColor;
    }
    function _updateProfilePreview(getVal) { /* ... */ }
    
    function _updateGalleryPreview(getVal) {
        const pvGallery = document.getElementById('preview-gallery');
        if(!pvGallery) return;

        pvGallery.style.gap = `${getVal('galleryGap')}rem`;

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


    // --- EVENT LISTENERS PRINCIPALES ---

    // Cualquier cambio en un input del formulario...
    settingsForm.addEventListener('input', (e) => {
        isDirty = true; // ...marca el formulario como 'sucio'.
        // Si el cambio no fue en el input de archivo, actualizamos la vista previa.
        if (e.target.id !== 'userAvatarFile') {
            updateLivePreviews();
            _updateControlStates();
        }
    });

    // Al enviar el formulario...
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // ...prevenimos el envío tradicional y...
        await saveSettings(); // ...llamamos a nuestra función para guardar en Supabase.
    });
    
    // Lógica para el botón de reseteo.
    const resetButton = document.getElementById('resetButton');
    if (resetButton) {
        resetButton.addEventListener('click', () => resetModal?.show());
    }
    if (confirmResetButton) {
        confirmResetButton.addEventListener('click', async () => {
             await loadSettings(); 
             isDirty = false;
             resetModal.hide();
             showNotificationModal('Restaurado', 'La configuración se ha restaurado a la última versión guardada.', 'success');
        });
    }

    // --- CARGA INICIAL ---
    // Finalmente, llamamos a loadSettings() una vez al principio para cargar todos los datos del usuario.
    await loadSettings();
});
// Nota: Las funciones auxiliares de la vista previa no se han comentado en detalle
// porque su lógica es repetitiva y se centra en la manipulación del DOM para fines visuales.
// El código completo de esas funciones se ha omitido aquí por brevedad.
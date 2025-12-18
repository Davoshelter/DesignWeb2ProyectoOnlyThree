// js/add-image.js

/**
 * Este archivo gestiona la página 'add-image.html'.
 * Su propósito es permitir a los usuarios autenticados subir nuevas imágenes a su portfolio.
 * El proceso implica:
 * 1. Proteger la página para que solo usuarios logueados puedan acceder.
 * 2. Manejar el formulario de subida.
 * 3. Subir el archivo de imagen a Supabase Storage.
 * 4. Guardar la información de la imagen (URL, descripción) en la tabla 'gallery_images' de la base de datos.
 * 5. Redirigir al usuario de vuelta a su portfolio para que vea la imagen recién añadida.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    const addImageForm = document.getElementById('add-image-form');
    const cancelButton = document.getElementById('cancel-button');
    
    // --- 1. PROTECCIÓN DE LA RUTA ---
    // Verificamos si hay un usuario con sesión activa.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        // Si no hay un usuario autenticado, lo redirigimos a la página de login.
        window.location.href = 'login.html';
        return; // Detenemos la ejecución del script.
    }

    // Si el usuario está logueado, configuramos el botón 'Cancelar' para que
    // lo devuelva a su propio portfolio.
    if (cancelButton) {
        cancelButton.href = `portfolio.html?userId=${user.id}`;
    }

    // --- 2. MANEJO DEL FORMULARIO DE SUBIDA ---
    addImageForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evitamos que la página se recargue al enviar el formulario.

        // Obtenemos los datos del formulario.
        const imageFileInput = document.getElementById('imageFile');
        const imageDescriptionInput = document.getElementById('imageDescription');
        const file = imageFileInput.files[0];
        const description = imageDescriptionInput.value;

        // Validación simple: nos aseguramos de que el usuario haya seleccionado un archivo.
        if (!file) {
            showNotificationModal('Error', 'Por favor, selecciona un archivo de imagen.', 'error');
            return;
        }

        // Damos feedback visual al usuario mientras se procesa la subida.
        const submitButton = addImageForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        showLoader();

        try {
            // --- 3. SUBIDA DEL ARCHIVO A SUPABASE STORAGE ---
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            // Creamos una ruta única para el archivo para evitar colisiones.
            // La estructura es: /gallery-images/{ID_DEL_USUARIO}/{NOMBRE_DEL_ARCHIVO}
            // Esto organiza las imágenes por carpetas de usuario en el bucket de Supabase.
            const filePath = `gallery-images/${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('imagenes') // 'imagenes' es el nombre de nuestro bucket en Supabase.
                .upload(filePath, file);

            if (uploadError) {
                // Si la subida al Storage falla, lanzamos un error para ser capturado por el bloque catch.
                throw uploadError;
            }

            // --- 4. OBTENCIÓN DE LA URL PÚBLICA ---
            // Una vez subido el archivo, necesitamos su URL pública para almacenarla en la base de datos.
            const { data: urlData } = supabase.storage
                .from('imagenes')
                .getPublicUrl(filePath);

            if (!urlData) {
                throw new Error("No se pudo obtener la URL pública de la imagen.");
            }
            const imageUrl = urlData.publicUrl;

            // --- 5. INSERCIÓN EN LA BASE DE DATOS ---
            // Guardamos la referencia a la imagen en nuestra tabla 'gallery_images'.
            // Esta tabla relaciona la imagen con el perfil del usuario.
            const { error: insertError } = await supabase
                .from('gallery_images')
                .insert({
                    profile_id: user.id,      // ID del usuario propietario.
                    image_url: imageUrl,      // La URL pública que obtuvimos.
                    description: description, // La descripción proporcionada por el usuario.
                    title: file.name          // Usamos el nombre original del archivo como título por defecto.
                });

            if (insertError) {
                // Si la inserción en la base de datos falla, lanzamos un error.
                throw insertError;
            }

            // --- 6. PROCESO COMPLETADO ---
            hideLoader();
            showNotificationModal('¡Imagen Subida!', 'Tu imagen ha sido añadida al portfolio.', 'success', 2000);

            // Redirigimos al usuario a su portfolio después de un breve instante
            // para que pueda ver la notificación de éxito.
            setTimeout(() => {
                window.location.href = `portfolio.html?userId=${user.id}`;
            }, 2000);

        } catch (error) {
            // Si ocurre cualquier error en el bloque 'try', será capturado aquí.
            hideLoader();
            console.error('Error en el proceso de subida:', error);
            showNotificationModal('Error en la subida', `Hubo un error: ${error.message}`, 'error');
            // Es importante rehabilitar el botón si algo sale mal.
            submitButton.disabled = false;
        }
    });
});


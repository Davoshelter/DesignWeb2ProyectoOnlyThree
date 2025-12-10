document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabaseClient;
    const addImageForm = document.getElementById('add-image-form');
    const cancelButton = document.getElementById('cancel-button');
    
    // 1. Proteger la ruta y obtener el usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        window.location.href = 'login.html';
        return;
    }

    // Configurar el botón de cancelar para que apunte al portfolio del usuario logueado
    if (cancelButton) {
        cancelButton.href = `portfolio.html?userId=${user.id}`;
    }

    // 2. Manejar el envío del formulario
    addImageForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const imageFileInput = document.getElementById('imageFile');
        const imageDescriptionInput = document.getElementById('imageDescription');
        const file = imageFileInput.files[0];
        const description = imageDescriptionInput.value;

        if (!file) {
            alert("Por favor, selecciona un archivo de imagen.");
            return;
        }

        // Deshabilitar el botón de submit para evitar envíos múltiples
        const submitButton = addImageForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Subiendo...';

        try {
            // 3. Subir archivo a Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `gallery-images/${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('imagenes') // Asegúrate de que el bucket se llame así
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // 4. Obtener la URL pública
            const { data: urlData } = supabase.storage
                .from('imagenes')
                .getPublicUrl(filePath);

            if (!urlData) {
                throw new Error("No se pudo obtener la URL pública de la imagen.");
            }
            const imageUrl = urlData.publicUrl;

            // 5. Insertar registro en la tabla gallery_images
            const { error: insertError } = await supabase
                .from('gallery_images')
                .insert({
                    profile_id: user.id,
                    image_url: imageUrl,
                    description: description,
                    title: file.name // Usamos el nombre del archivo como título por defecto
                });

            if (insertError) {
                throw insertError;
            }

            // 6. Redirigir al portfolio
            window.location.href = `portfolio.html?userId=${user.id}`;

        } catch (error) {
            console.error('Error en el proceso de subida:', error);
            alert(`Hubo un error: ${error.message}`);
            // Rehabilitar el botón si hay un error
            submitButton.disabled = false;
            submitButton.textContent = 'Añadir Imagen al Portfolio';
        }
    });
});


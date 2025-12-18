// js/auth.js

/**
 * Este archivo maneja toda la lógica relacionada con la autenticación de usuarios:
 * 1. El proceso de registro de nuevos usuarios en la página register.html.
 * 2. El proceso de inicio de sesión de usuarios existentes en la página login.html.
 * Utiliza el cliente de Supabase (window.supabaseClient) para interactuar con el backend.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Se obtiene el cliente de Supabase, que fue inicializado en supabase-client.js
    const supabase = window.supabaseClient;

    // --- LÓGICA PARA LA PÁGINA DE REGISTRO ---
    const registerForm = document.getElementById('register-form');

    // Se asocia un listener al formulario de registro solo si existe en la página actual.
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            // Prevenir el comportamiento por defecto del formulario (que recargaría la página).
            event.preventDefault();
            
            const submitButton = registerForm.querySelector('button[type="submit"]');
            
            // Extraer los valores de los campos del formulario.
            const form = event.target;
            const email = form.email.value;
            const password = form.password.value;
            const fullName = form.fullName.value;

            // --- BLOQUE DE VALIDACIONES DEL LADO DEL CLIENTE ---
            // Antes de enviar los datos a Supabase, realizamos comprobaciones básicas
            // para asegurar la calidad de los datos y mejorar la experiencia del usuario.

            // 1. Validación de la longitud del nombre.
            if (fullName.length < 5) {
                showNotificationModal('Error de Validación', 'El nombre completo debe tener al menos 5 caracteres.', 'error');
                return; // Detiene la ejecución si la validación falla.
            }

            // 2. Validación de la longitud de la contraseña.
            if (password.length < 9) {
                showNotificationModal('Error de Validación', 'La contraseña debe tener al menos 9 caracteres.', 'error');
                return; // Detiene la ejecución.
            }

            // 3. Validación del formato del correo electrónico.
            const emailPrefix = email.split('@')[0];
            if (emailPrefix.length < 7) {
                showNotificationModal('Error de Validación', 'El identificador del correo (antes del "@") debe tener al menos 7 caracteres.', 'error');
                return; // Detiene la ejecución.
            }

            // Deshabilitar el botón y mostrar un loader para dar feedback visual al usuario.
            submitButton.disabled = true;
            showLoader();

            // --- LLAMADA A SUPABASE AUTH PARA REGISTRAR AL USUARIO ---
            // 'signUp' crea una nueva entrada en la tabla 'auth.users' de Supabase.
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // 'data' permite pasar metadatos que se almacenarán con el usuario.
                    // Aquí lo usamos para guardar el nombre completo, que luego usaremos para crear su perfil.
                    data: { full_name: fullName }
                }
            });

            if (signUpError) {
                // Si Supabase devuelve un error (ej: el email ya existe), lo mostramos.
                hideLoader();
                showNotificationModal('Error en el registro', signUpError.message, 'error');
                submitButton.disabled = false; // Reactivar el botón.
            } else {
                // Si el registro es exitoso, informamos al usuario.
                showNotificationModal('¡Registro Completado!', 'Bienvenido a OwnDesign. Serás redirigido a tu nuevo portfolio.', 'success', 2500);
                
                // --- INICIO DE SESIÓN AUTOMÁTICO ---
                // Después de un registro exitoso, iniciamos sesión automáticamente
                // para que el usuario no tenga que volver a introducir sus credenciales.
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

                // Se establece un temporizador para que la notificación de éxito sea visible
                // antes de redirigir al usuario.
                setTimeout(() => {
                    hideLoader();
                    if (signInError) {
                         // Si el inicio de sesión automático falla, lo mandamos a la página de login.
                         window.location.href = 'login.html';
                    } else {
                         // --- REDIRECCIÓN CORREGIDA ---
                         // Si todo fue bien, redirigimos al usuario a su portfolio recién creado.
                         // Usamos el ID del usuario para construir la URL correcta.
                         window.location.href = `portfolio.html?userId=${signInData.user.id}`;
                    }
                }, 2500);
            }
        });
    }

    // --- LÓGICA PARA LA PÁGINA DE LOGIN ---
    const loginForm = document.getElementById('login-form');
    
    // Se asocia un listener al formulario de login solo si existe en la página actual.
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            showLoader();

            const form = event.target;
            const email = form.email.value;
            const password = form.password.value;

            // --- LLAMADA A SUPABASE AUTH PARA INICIAR SESIÓN ---
            // 'signInWithPassword' verifica las credenciales contra la base de datos de Supabase.
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) {
                // Si las credenciales son incorrectas, Supabase devuelve un error.
                hideLoader();
                showNotificationModal('Error al iniciar sesión', error.message, 'error');
                submitButton.disabled = false;
            } else {
                // Si el inicio de sesión es exitoso, esperamos un segundo y redirigimos.
                setTimeout(() => {
                    hideLoader();
                    // Redirigimos al portfolio personal del usuario que ha iniciado sesión.
                    window.location.href = `portfolio.html?userId=${data.user.id}`;
                }, 1000);
            }
        });
    }
});

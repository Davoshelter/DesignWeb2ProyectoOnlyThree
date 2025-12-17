// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const supabase = window.supabaseClient;

    // === PÁGINA DE REGISTRO ===
    const registerForm = document.getElementById('register-form');
    const registerSuccessModal = document.getElementById('registerSuccessModal');
    let bsRegisterModal;
    if (registerSuccessModal) {
        bsRegisterModal = new bootstrap.Modal(registerSuccessModal);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = registerForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            showLoader();

            const form = event.target;
            const email = form.email.value;
            const password = form.password.value;
            const fullName = form.fullName.value;

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });

            if (signUpError) {
                hideLoader();
                showNotificationModal('Error en el registro', signUpError.message, 'error');
                submitButton.disabled = false;
            } else {
                showNotificationModal('¡Registro Completado!', 'Bienvenido a OwnDesign. Serás redirigido para configurar tu perfil.', 'success', 2500);
                
                // Iniciar sesión automáticamente después del registro exitoso
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

                setTimeout(() => {
                    hideLoader();
                    if (signInError) {
                         window.location.href = 'login.html';
                    } else {
                         window.location.href = 'settings.html';
                    }
                }, 2500); // Esperar 2.5 segundos antes de redirigir
            }
        });
    }

    // === PÁGINA DE LOGIN ===
    const loginForm = document.getElementById('login-form');
    const loginProcessModal = document.getElementById('loginProcessModal');
    let bsLoginModal;
    if(loginProcessModal) {
        bsLoginModal = new bootstrap.Modal(loginProcessModal);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            showLoader();

            const form = event.target;
            const email = form.email.value;
            const password = form.password.value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            if (error) {
                hideLoader();
                showNotificationModal('Error al iniciar sesión', error.message, 'error');
                submitButton.disabled = false;
            } else {
                // La redirección ocurrirá naturalmente. Si queremos un delay:
                setTimeout(() => {
                    hideLoader();
                    // Redirigir al portfolio del usuario en lugar de a settings
                    window.location.href = `portfolio.html?userId=${data.user.id}`;
                }, 1000);
            }
        });
    }
});

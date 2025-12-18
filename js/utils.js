// js/utils.js

/**
 * Este archivo contiene funciones de utilidad (helpers) reutilizables en toda la aplicación.
 * El objetivo es centralizar código común para tareas repetitivas, como mostrar notificaciones
 * o indicadores de carga, manteniendo el resto del código más limpio y legible.
 */

/**
 * Muestra un modal de notificación flotante y personalizable.
 * Esta función crea dinámicamente un modal de Bootstrap, lo muestra y lo destruye.
 * 
 * @param {string} title - El título del modal.
 * @param {string} message - El mensaje a mostrar en el cuerpo del modal.
 * @param {string} type - El tipo de modal ('success', 'error', 'warning'). Afecta el ícono y color.
 * @param {number} duration - Tiempo en milisegundos para que el modal se cierre solo. Si es 0, no se cierra automáticamente.
 */
function showNotificationModal(title, message, type = 'success', duration = 3000) {
    // Para evitar la acumulación de modales en el DOM, primero eliminamos cualquier instancia previa.
    const existingModal = document.getElementById('notificationModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Mapeo para seleccionar el ícono y color de Bootstrap Icons según el tipo de notificación.
    const iconMap = {
        success: 'bi-check-circle-fill',
        error: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill'
    };
    const colorMap = {
        success: 'text-success',
        error: 'text-danger',
        warning: 'text-warning'
    };

    const iconClass = iconMap[type] || 'bi-info-circle-fill';
    const colorClass = colorMap[type] || 'text-primary';

    // Se construye el HTML del modal como un string.
    const modalHTML = `
        <div class="modal fade" id="notificationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-card border-0">
                    <div class="modal-header border-bottom-0 pb-0">
                         <h5 class="modal-title text-white fw-bold d-flex align-items-center gap-2">
                            <i class="bi ${iconClass} ${colorClass} fs-4"></i>
                            ${title}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-white-50 py-4">
                        ${message}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Se inyecta el HTML del modal al final del body.
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalElement = document.getElementById('notificationModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // Se muestra el modal.
    modal.show();

    // Si se especificó una duración, se programa su cierre y eliminación del DOM.
    if (duration > 0) {
        setTimeout(() => {
            modal.hide();
            // Es importante esperar al evento 'hidden.bs.modal' para eliminar el elemento,
            // así nos aseguramos de que la animación de salida de Bootstrap se complete.
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            }, { once: true }); // { once: true } hace que el listener se elimine solo después de ejecutarse.
        }, duration);
    } else {
        // Si no hay duración, simplemente lo eliminamos cuando el usuario lo cierre manualmente.
         modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        }, { once: true });
    }
}

/**
 * Muestra un overlay de carga (spinner) en toda la página.
 * Es útil para dar feedback al usuario durante operaciones asíncronas (ej: llamadas a la API).
 */
function showLoader() {
    // Prevenimos la duplicación de loaders.
    const existingLoader = document.getElementById('pageLoader');
    if (existingLoader) {
        existingLoader.remove();
    }

    const loaderHTML = `
        <div id="pageLoader" class="page-loader">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="text-white-50 mt-3">Cargando...</p>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loaderHTML);
}

/**
 * Oculta y elimina el overlay de carga.
 * Utiliza una transición suave de fade-out definida en el CSS.
 */
function hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        // Añadimos una clase que activa la animación de fade-out.
        loader.classList.add('fade-out');
        // Esperamos a que la animación termine (300ms) antes de eliminar el elemento del DOM.
        setTimeout(() => {
            loader.remove();
        }, 300);
    }
}
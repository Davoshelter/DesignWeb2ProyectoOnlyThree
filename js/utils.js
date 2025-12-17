// js/utils.js

/**
 * Muestra un modal de notificación personalizable.
 * @param {string} title - El título del modal.
 * @param {string} message - El mensaje a mostrar en el cuerpo del modal.
 * @param {string} type - El tipo de modal ('success', 'error', 'warning'). Afecta el color del ícono y la barra.
 * @param {number} duration - La duración en milisegundos antes de que el modal se cierre automáticamente. 0 para no cerrar.
 */
function showNotificationModal(title, message, type = 'success', duration = 3000) {
    // Eliminar cualquier modal existente para evitar duplicados
    const existingModal = document.getElementById('notificationModal');
    if (existingModal) {
        existingModal.remove();
    }

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

    const modalHTML = `
        <div class="modal fade" id="notificationModal" tabindex="-1" aria-labelledby="notificationModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-card border-0">
                    <div class="modal-header border-bottom-0 pb-0">
                         <h5 class="modal-title text-white fw-bold d-flex align-items-center gap-2" id="notificationModalLabel">
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

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalElement = document.getElementById('notificationModal');
    const modal = new bootstrap.Modal(modalElement);
    
    modal.show();

    if (duration > 0) {
        setTimeout(() => {
            modal.hide();
            // Esperar a que la transición de ocultar termine para remover el elemento del DOM
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            }, { once: true });
        }, duration);
    } else {
         modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        }, { once: true });
    }
}

/**
 * Muestra un overlay de carga en toda la página.
 */
function showLoader() {
    // Eliminar cualquier loader existente
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
 * Oculta el overlay de carga.
 */
function hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) {
        // Añadir una clase para la transición de fade-out
        loader.classList.add('fade-out');
        // Eliminar el elemento después de la transición
        setTimeout(() => {
            loader.remove();
        }, 300); // La duración debe coincidir con la de la animación en CSS
    }
}
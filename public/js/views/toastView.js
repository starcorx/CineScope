/**
 * CineScope - Toast View
 * Muestra notificaciones flotantes estilizadas con soporte para acciones (Deshacer)
 */
const ToastView = {
  containerId: 'toast-container',

  getContainer() {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'cinema-toast-container';
      document.body.appendChild(container);
    }
    return container;
  },

  show(message, type = 'info', duration = 4000, action = null) {
    const container = this.getContainer();

    const toast = document.createElement('div');
    toast.className = `cinema-toast ${type}`;

    let iconClass = 'bi-info-circle-fill text-info';
    if (type === 'success') iconClass = 'bi-check-circle-fill text-success';
    if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill text-warning';
    if (type === 'danger' || type === 'error') iconClass = 'bi-x-circle-fill text-danger';

    let actionBtnHtml = '';
    if (action && action.text) {
      actionBtnHtml = `
        <button type="button" class="toast-action-btn">
          <i class="bi bi-arrow-counterclockwise me-1"></i>${action.text}
        </button>
      `;
    }

    toast.innerHTML = `
      <i class="bi ${iconClass} toast-icon"></i>
      <p class="toast-message">${message}</p>
      ${actionBtnHtml}
    `;

    let dismissTimer = null;
    const dismiss = () => {
      clearTimeout(dismissTimer);
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    };

    if (action && typeof action.onClick === 'function') {
      const btn = toast.querySelector('.toast-action-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          dismiss();
          action.onClick();
        });
      }
    }

    container.appendChild(toast);

    dismissTimer = setTimeout(dismiss, duration);
  }
};

window.ToastView = ToastView;

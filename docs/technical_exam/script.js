function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeIcon(currentTheme);

    // FEATURE: Load saved notes on page load and set up auto-save
    const notesArea = document.getElementById('exam-notes');
    if (notesArea) {
        notesArea.value = localStorage.getItem('examNotes') || '';
        
        // Auto-save on input
        notesArea.addEventListener('input', (e) => {
            localStorage.setItem('examNotes', e.target.value);
        });
    }
});

// FEATURE: Sistema de Navegación por Pestañas (SPA behavior)
function openTab(evt, tabId) {
    // 1. Ocultar todo el contenido
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active-tab');
    });

    // 2. Quitar el estado 'active' de todos los botones del menú
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Mostrar el contenido seleccionado y activar el botón
    document.getElementById(tabId).classList.add('active-tab');
    evt.currentTarget.classList.add('active');
    
    // Opcional: Hacer scroll hacia arriba en móviles al cambiar de pestaña
    if (window.innerWidth <= 850) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// FEATURE: Sistema de Notificaciones Toast
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Eliminar el elemento del DOM después de la animación
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function clearNotes() {
    const textarea = document.getElementById('exam-notes');
    if (textarea) {
        textarea.value = '';
        localStorage.removeItem('examNotes'); // Clear from storage too
        showToast('🧹 Notes cleared successfully!');
    }
}

// FEATURE: Download notes as a .txt file
function downloadNotes() {
    const text = document.getElementById('exam-notes')?.value;
    if (!text) {
        showToast('⚠️ Your notebook is empty!');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data-eng-exam-notes.txt';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('📥 Notes downloaded successfully!');
}

// Hacer la función global si usas módulos (no es estrictamente necesario en vanilla, pero buena práctica)
window.toggleTheme = toggleTheme;
window.clearNotes = clearNotes;
window.downloadNotes = downloadNotes;
window.openTab = openTab;
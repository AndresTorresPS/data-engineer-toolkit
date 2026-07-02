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

    const quizForm = document.getElementById('cloud-quiz');
    const resetButton = document.getElementById('cloud-reset');
    const resultsCard = document.getElementById('cloud-results');

    if (quizForm) {
        quizForm.addEventListener('submit', (event) => {
            event.preventDefault();
            evaluateCloudQuiz();
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', resetCloudQuiz);
    }

    if (resultsCard) {
        resultsCard.hidden = true;
    }
});

function evaluateCloudQuiz() {
    const quizForm = document.getElementById('cloud-quiz');
    const resultsCard = document.getElementById('cloud-results');

    if (!quizForm || !resultsCard) return;

    const questionBlocks = quizForm.querySelectorAll('.quiz-question');
    let correctAnswers = 0;
    let answeredQuestions = 0;
    const feedback = [];

    questionBlocks.forEach((block, index) => {
        const selectedOption = block.querySelector('input[type="radio"]:checked');
        const correctOption = block.querySelector('input[data-correct="true"]');
        const optionRows = block.querySelectorAll('.option-row');

        optionRows.forEach((row) => row.classList.remove('correct', 'wrong'));

        if (selectedOption) {
            answeredQuestions += 1;
        }

        if (selectedOption && correctOption && selectedOption === correctOption) {
            correctAnswers += 1;
            feedback.push(`Q${index + 1}: Correct`);
        } else {
            feedback.push(`Q${index + 1}: ${selectedOption ? 'Incorrect' : 'Unanswered'}`);
        }

        if (correctOption) {
            correctOption.closest('.option-row')?.classList.add('correct');
        }

        if (selectedOption && correctOption && selectedOption !== correctOption) {
            selectedOption.closest('.option-row')?.classList.add('wrong');
        }
    });

    const percentage = Math.round((correctAnswers / questionBlocks.length) * 100);
    let performanceLabel = 'Needs more study';

    if (percentage >= 80) {
        performanceLabel = 'Excellent work';
    } else if (percentage >= 60) {
        performanceLabel = 'Good grasp';
    } else if (percentage >= 40) {
        performanceLabel = 'Needs review';
    }

    resultsCard.hidden = false;
    resultsCard.innerHTML = `
        <h3>Cloud Architecture Results</h3>
        <p class="score-badge">${correctAnswers}/${questionBlocks.length} correct (${percentage}%)</p>
        <p><strong>${performanceLabel}</strong></p>
        <p>Answered: ${answeredQuestions}/${questionBlocks.length}</p>
        <ul class="result-list">
            ${feedback.map(item => `<li>${item}</li>`).join('')}
        </ul>
    `;

    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetCloudQuiz() {
    const quizForm = document.getElementById('cloud-quiz');
    const resultsCard = document.getElementById('cloud-results');

    if (!quizForm || !resultsCard) return;

    quizForm.reset();
    quizForm.querySelectorAll('.option-row').forEach((row) => row.classList.remove('correct', 'wrong'));
    resultsCard.hidden = true;
    resultsCard.innerHTML = '';
}

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
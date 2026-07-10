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

    const etlQuizForm = document.getElementById('etl-quiz');
    const etlResetButton = document.getElementById('etl-reset');
    const etlResultsCard = document.getElementById('etl-results');

    if (etlQuizForm) {
        etlQuizForm.addEventListener('submit', (event) => {
            event.preventDefault();
            evaluateEtlQuiz();
        });
    }

    if (etlResetButton) {
        etlResetButton.addEventListener('click', resetEtlQuiz);
    }

    if (etlResultsCard) {
        etlResultsCard.hidden = true;
    }

    loadCloudQuestions();
    loadEtlQuestions();
    initializeAdmin();
});

async function fetchQuestions(section = 'sec1') {
    try {
        const response = await fetch(`/api/questions?section=${encodeURIComponent(section)}`);
        if (!response.ok) {
            throw new Error('Failed to load questions');
        }
        return response.json();
    } catch (error) {
        console.error(error);
        showToast('⚠️ No se pudieron cargar las preguntas. Revisa el servidor de desarrollo.');
        return [];
    }
}

function renderQuestion(question, index) {
    return `
        <div class="quiz-question" data-question-id="${question.id}" data-correct-option="${question.correctOption}">
            <h3>${index + 1}. ${question.question}</h3>
            <label class="option-row"><input type="radio" name="q${question.id}" value="A"><span>A. ${question.optionA}</span></label>
            <label class="option-row"><input type="radio" name="q${question.id}" value="B"><span>B. ${question.optionB}</span></label>
            <label class="option-row"><input type="radio" name="q${question.id}" value="C"><span>C. ${question.optionC}</span></label>
            <label class="option-row"><input type="radio" name="q${question.id}" value="D"><span>D. ${question.optionD}</span></label>
        </div>
    `;
}

async function loadCloudQuestions() {
    const questionsContainer = document.getElementById('cloud-questions');
    const loadingCard = document.getElementById('cloud-loading');
    const resultsCard = document.getElementById('cloud-results');

    if (!questionsContainer || !loadingCard) return;

    questionsContainer.innerHTML = '';
    if (resultsCard) {
        resultsCard.hidden = true;
        resultsCard.innerHTML = '';
    }
    loadingCard.hidden = false;
    loadingCard.textContent = 'Loading questions from the development database...';

    const questions = await fetchQuestions('sec1');

    if (questions.length === 0) {
        loadingCard.textContent = 'No questions found for this section.';
        return;
    }

    questionsContainer.innerHTML = questions.map(renderQuestion).join('');
    loadingCard.hidden = true;
}

function getAdminFields() {
    return {
        id: document.getElementById('admin-question-id').value,
        section: document.getElementById('admin-section').value,
        question: document.getElementById('admin-question').value.trim(),
        optionA: document.getElementById('admin-optionA').value.trim(),
        optionB: document.getElementById('admin-optionB').value.trim(),
        optionC: document.getElementById('admin-optionC').value.trim(),
        optionD: document.getElementById('admin-optionD').value.trim(),
        correctOption: document.getElementById('admin-correct-option').value,
    };
}

function setAdminFields({ id = '', section = 'sec1', question = '', optionA = '', optionB = '', optionC = '', optionD = '', correctOption = 'A' } = {}) {
    document.getElementById('admin-question-id').value = id;
    document.getElementById('admin-section').value = section;
    document.getElementById('admin-question').value = question;
    document.getElementById('admin-optionA').value = optionA;
    document.getElementById('admin-optionB').value = optionB;
    document.getElementById('admin-optionC').value = optionC;
    document.getElementById('admin-optionD').value = optionD;
    document.getElementById('admin-correct-option').value = correctOption;
}

function renderAdminRow(question) {
    return `
        <tr data-id="${question.id}">
            <td>${question.id}</td>
            <td>${question.section}</td>
            <td>${question.question}</td>
            <td>${question.correctOption}</td>
            <td>
                <button type="button" class="secondary admin-edit-btn" data-id="${question.id}">Edit</button>
                <button type="button" class="secondary admin-delete-btn" data-id="${question.id}">Delete</button>
            </td>
        </tr>
    `;
}

async function loadAdminQuestions(section = 'sec1') {
    const tableBody = document.querySelector('#admin-questions-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5">Loading questions...</td></tr>';

    const questions = await fetchQuestions(section);

    if (questions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No questions found for this section.</td></tr>';
        return;
    }

    tableBody.innerHTML = questions.map(renderAdminRow).join('');
    attachAdminRowListeners();
}

async function restoreAdminQuestions() {
    if (!confirm('Restore the default question set? This will delete all current questions and replace them with the built-in seed data.')) {
        return;
    }

    const restoreButton = document.getElementById('admin-restore');
    if (restoreButton) {
        restoreButton.disabled = true;
        restoreButton.textContent = 'Restoring...';
    }

    try {
        const response = await fetch('/api/questions/restore', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to restore questions');
        }

        await loadAdminQuestions(document.getElementById('admin-filter-section').value);
        showToast('✅ Default questions restored successfully');
    } catch (error) {
        console.error(error);
        showToast('⚠️ Error restoring default questions.');
    } finally {
        if (restoreButton) {
            restoreButton.disabled = false;
            restoreButton.textContent = 'Restore defaults';
        }
    }
}

function attachAdminRowListeners() {
    document.querySelectorAll('.admin-edit-btn').forEach((button) => {
        button.addEventListener('click', async (event) => {
            const id = event.currentTarget.dataset.id;
            if (id) {
                await loadAdminQuestion(id);
            }
        });
    });

    document.querySelectorAll('.admin-delete-btn').forEach((button) => {
        button.addEventListener('click', async (event) => {
            const id = event.currentTarget.dataset.id;
            if (id && confirm('Delete this question from the development database?')) {
                await deleteAdminQuestion(id);
            }
        });
    });
}

async function loadAdminQuestion(id) {
    try {
        const response = await fetch(`/api/questions/${encodeURIComponent(id)}`);
        if (!response.ok) {
            throw new Error('Failed to load question');
        }
        const question = await response.json();
        setAdminFields(question);
        showToast('✅ Question loaded for editing');
    } catch (error) {
        console.error(error);
        showToast('⚠️ No se pudo cargar la pregunta para edición.');
    }
}

function resetAdminForm() {
    setAdminFields();
    showToast('Formulario de administración reiniciado.');
}

async function saveAdminQuestion(event) {
    event.preventDefault();
    const questionData = getAdminFields();
    const hasId = Boolean(questionData.id);
    const url = hasId ? `/api/questions/${encodeURIComponent(questionData.id)}` : '/api/questions';
    const method = hasId ? 'PUT' : 'POST';

    const body = {
        section: questionData.section,
        question: questionData.question,
        optionA: questionData.optionA,
        optionB: questionData.optionB,
        optionC: questionData.optionC,
        optionD: questionData.optionD,
        correctOption: questionData.correctOption,
    };

    if (!body.question || !body.optionA || !body.optionB || !body.optionC || !body.optionD) {
        showToast('⚠️ Completa todos los campos antes de guardar.');
        return;
    }

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save question');
        }

        resetAdminForm();
        loadAdminQuestions(document.getElementById('admin-filter-section').value);
        showToast(`✅ Pregunta ${hasId ? 'actualizada' : 'creada'} correctamente`);
    } catch (error) {
        console.error(error);
        showToast('⚠️ Error al guardar la pregunta.');
    }
}

async function deleteAdminQuestion(id) {
    try {
        const response = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete question');
        }

        loadAdminQuestions(document.getElementById('admin-filter-section').value);
        showToast('✅ Pregunta eliminada correctamente');
    } catch (error) {
        console.error(error);
        showToast('⚠️ Error al eliminar la pregunta.');
    }
}

function addAdminEventListeners() {
    const adminForm = document.getElementById('admin-form');
    const adminReset = document.getElementById('admin-reset');
    const adminRefresh = document.getElementById('admin-refresh');
    const adminRestore = document.getElementById('admin-restore');
    const sectionFilter = document.getElementById('admin-filter-section');

    if (adminForm) {
        adminForm.addEventListener('submit', saveAdminQuestion);
    }

    if (adminReset) {
        adminReset.addEventListener('click', resetAdminForm);
    }

    if (adminRefresh) {
        adminRefresh.addEventListener('click', () => {
            loadAdminQuestions(sectionFilter.value);
        });
    }

    if (adminRestore) {
        adminRestore.addEventListener('click', restoreAdminQuestions);
    }

    if (sectionFilter) {
        sectionFilter.addEventListener('change', () => {
            loadAdminQuestions(sectionFilter.value);
        });
    }
}

function initializeAdmin() {
    addAdminEventListeners();
    loadAdminQuestions(document.getElementById('admin-filter-section').value);
}

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
        const questionId = block.getAttribute('data-question-id');
        const correctAnswer = block.dataset.correctOption;
        const optionRows = block.querySelectorAll('.option-row');

        optionRows.forEach((row) => row.classList.remove('correct', 'wrong'));

        if (selectedOption) {
            answeredQuestions += 1;
        }

        const selectedValue = selectedOption ? selectedOption.value : null;

        if (selectedValue && correctAnswer && selectedValue === correctAnswer) {
            correctAnswers += 1;
            feedback.push(`Q${index + 1}: Correct`);
        } else {
            feedback.push(`Q${index + 1}: ${selectedValue ? 'Incorrect' : 'Unanswered'}`);
        }

        const correctRow = Array.from(optionRows).find((row) => row.querySelector(`input[value="${correctAnswer}"]`));
        if (correctRow) {
            correctRow.classList.add('correct');
        }

        if (selectedOption && selectedValue !== correctAnswer) {
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

async function loadEtlQuestions() {
    const questionsContainer = document.getElementById('etl-questions');
    const loadingCard = document.getElementById('etl-loading');
    const resultsCard = document.getElementById('etl-results');

    if (!questionsContainer || !loadingCard) return;

    questionsContainer.innerHTML = '';
    if (resultsCard) {
        resultsCard.hidden = true;
        resultsCard.innerHTML = '';
    }
    loadingCard.hidden = false;
    loadingCard.textContent = 'Loading questions from the development database...';

    const questions = await fetchQuestions('sec2');

    if (questions.length === 0) {
        loadingCard.textContent = 'No questions found for this section.';
        return;
    }

    questionsContainer.innerHTML = questions.map(renderQuestion).join('');
    loadingCard.hidden = true;
}

function evaluateEtlQuiz() {
    const quizForm = document.getElementById('etl-quiz');
    const resultsCard = document.getElementById('etl-results');

    if (!quizForm || !resultsCard) return;

    const questionBlocks = quizForm.querySelectorAll('.quiz-question');
    let correctAnswers = 0;
    let answeredQuestions = 0;
    const feedback = [];

    questionBlocks.forEach((block, index) => {
        const selectedOption = block.querySelector('input[type="radio"]:checked');
        const questionId = block.getAttribute('data-question-id');
        const correctAnswer = block.dataset.correctOption;
        const optionRows = block.querySelectorAll('.option-row');

        optionRows.forEach((row) => row.classList.remove('correct', 'wrong'));

        if (selectedOption) {
            answeredQuestions += 1;
        }

        const selectedValue = selectedOption ? selectedOption.value : null;

        if (selectedValue && correctAnswer && selectedValue === correctAnswer) {
            correctAnswers += 1;
            feedback.push(`Q${index + 1}: Correct`);
        } else {
            feedback.push(`Q${index + 1}: ${selectedValue ? 'Incorrect' : 'Unanswered'}`);
        }

        const correctRow = Array.from(optionRows).find((row) => row.querySelector(`input[value="${correctAnswer}"]`));
        if (correctRow) {
            correctRow.classList.add('correct');
        }

        if (selectedOption && selectedValue !== correctAnswer) {
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
        <h3>Orchestration & ETL Results</h3>
        <p class="score-badge">${correctAnswers}/${questionBlocks.length} correct (${percentage}%)</p>
        <p><strong>${performanceLabel}</strong></p>
        <p>Answered: ${answeredQuestions}/${questionBlocks.length}</p>
        <ul class="result-list">
            ${feedback.map(item => `<li>${item}</li>`).join('')}
        </ul>
    `;

    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetEtlQuiz() {
    const quizForm = document.getElementById('etl-quiz');
    const resultsCard = document.getElementById('etl-results');

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
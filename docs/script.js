// Theme Toggle Logic
function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

// Initialize Icon on load
document.addEventListener('DOMContentLoaded', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    updateThemeIcon(currentTheme);
});

// --- Original Engine Logic Below ---

const mockDb = {
    users: [
        { user_id: 1, name: 'Alice Smith', country: 'USA', signup_date: '2026-01-10' },
        { user_id: 2, name: 'Carlos Buendia', country: 'Colombia', signup_date: '2026-02-14' },
        { user_id: 3, name: 'Elena Rostova', country: 'Germany', signup_date: '2026-03-01' },
        { user_id: 4, name: 'David Lee', country: 'USA', signup_date: '2026-03-22' }
    ],
    orders: [
        { order_id: 101, user_id: 1, order_date: '2026-02-20', total_amount: 150.00 },
        { order_id: 102, user_id: 2, order_date: '2026-03-15', total_amount: 45.50 },
        { order_id: 103, user_id: 1, order_date: '2026-04-10', total_amount: 210.00 },
        { order_id: 104, user_id: 3, order_date: '2026-05-02', total_amount: 89.99 },
        { order_id: 105, user_id: 2, order_date: '2026-05-28', total_amount: 120.00 }
    ]
};

const codeTemplates = {
    1: "SELECT order_id, user_id, order_date, total_amount\nFROM orders\nWHERE total_amount > 100 \n  AND order_date BETWEEN '2026-01-01' AND '2026-06-01'\nORDER BY total_amount DESC;",
    2: "SELECT u.country, COUNT(o.order_id) AS total_orders\nFROM users u\nJOIN orders o ON u.user_id = o.user_id\nGROUP BY u.country\nHAVING COUNT(o.order_id) > 1;"
};

function loadTemplate(id) {
    document.getElementById('editor').value = codeTemplates[id];
}

function clearWorkspace() {
    document.getElementById('editor').value = '';
    document.getElementById('output-buffer').innerHTML = '<span style="color: var(--text-muted); font-size: 14px;">Terminal standby. Awaiting query dispatch execution metrics...</span>';
    const explorerPreview = document.getElementById('explorer-preview');
    if (explorerPreview) {
        explorerPreview.innerHTML = '<span style="color: var(--text-muted); font-size: 14px;">Select a table to inspect sample rows and column metadata.</span>';
    }
}

function renderTablePreview(tableName) {
    const preview = document.getElementById('explorer-preview');
    if (!preview) return;

    const tableData = mockDb[tableName];
    if (!Array.isArray(tableData)) {
        preview.innerHTML = '<div class="status-msg error">Preview Error: Table not found in mock database.</div>';
        return;
    }

    if (tableData.length === 0) {
        preview.innerHTML = '<div class="status-msg success">Empty Table: There are no rows available to preview.</div>';
        return;
    }

    const sampleRows = tableData.slice(0, 5);
    const columns = Object.keys(sampleRows[0]);
    let html = '<div class="status-msg success">Showing up to 5 rows from <strong>' + tableName + '</strong>. Total rows: ' + tableData.length + '.</div>';
    html += '<table class="preview-table"><thead><tr>';
    columns.forEach(col => { html += '<th>' + col + '</th>'; });
    html += '</tr></thead><tbody>';

    sampleRows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => { html += '<td class="mono">' + row[col] + '</td>'; });
        html += '</tr>';
    });
    html += '</tbody></table>';

    preview.innerHTML = html;
}

function downloadTableCsv() {
    const tableName = document.getElementById('table-select').value;
    const tableData = mockDb[tableName];
    if (!Array.isArray(tableData) || tableData.length === 0) {
        const preview = document.getElementById('explorer-preview');
        if (preview) {
            preview.innerHTML = '<div class="status-msg error">Export Error: There is no data to export for ' + tableName + '.</div>';
        }
        return;
    }

    const columns = Object.keys(tableData[0]);
    const csvLines = [columns.join(',')];
    tableData.forEach(row => {
        const line = columns.map(col => {
            const value = row[col] ?? '';
            const escaped = String(value).replace(/"/g, '""');
            return '"' + escaped + '"';
        }).join(',');
        csvLines.push(line);
    });

    const csv = csvLines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = tableName + '_preview.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function runPipeline() {
    const editorEl = document.getElementById('editor');
    const buffer = document.getElementById('output-buffer');

    const rawSql = (editorEl.value || '').trim();
    if (!rawSql) {
        buffer.innerHTML = '<div class="status-msg error">Pipeline Fault: Command input is empty.</div>';
        return;
    }

    const normalized = rawSql.toUpperCase();
    if (!/\bSELECT\b/i.test(normalized) || !/\bFROM\b/i.test(normalized)) {
        buffer.innerHTML = '<div class="status-msg error">Compilation Failure: Standard SQL commands require explicitly declared SELECT and FROM boundaries.</div>';
        return;
    }

    try {
        let stream = [];

        if (/\bJOIN\b/.test(normalized)) {
            mockDb.users.forEach(u => {
                mockDb.orders.forEach(o => {
                    if (u.user_id === o.user_id) stream.push(Object.assign({}, u, o));
                });
            });
        } else if (/FROM\s+USERS\b/.test(normalized)) {
            stream = typeof structuredClone === 'function' ? structuredClone(mockDb.users) : JSON.parse(JSON.stringify(mockDb.users));
        } else if (/FROM\s+ORDERS\b/.test(normalized)) {
            stream = typeof structuredClone === 'function' ? structuredClone(mockDb.orders) : JSON.parse(JSON.stringify(mockDb.orders));
        } else {
            throw new Error("Invalid Object Model Context. Target catalog namespaces must resolve to 'users' or 'orders'.");
        }

        if (/\bWHERE\b/.test(normalized)) {
            if (/TOTAL_AMOUNT\s*>\s*100/.test(normalized)) {
                stream = stream.filter(r => (r.total_amount || 0) > 100);
            }
            if (/BETWEEN/.test(normalized)) {
                stream = stream.filter(r => (r.order_date >= '2026-01-01' && r.order_date <= '2026-06-01'));
            }
        }

        if (/\bGROUP BY\b/.test(normalized)) {
            const groups = {};
            stream.forEach(item => {
                const key = item.country || 'Undefined';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            stream = Object.keys(groups).map(k => ({ country: k, total_orders: groups[k].length }));

            if (/\bHAVING\b/.test(normalized) && />\s*1/.test(normalized)) {
                stream = stream.filter(r => r.total_orders > 1);
            }
        }

        if (/\bORDER BY\b/.test(normalized)) {
            if (/TOTAL_AMOUNT/.test(normalized) && /DESC/.test(normalized)) {
                stream.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
            }
        }

        if (stream.length === 0) {
            buffer.innerHTML = '<div class="status-msg success">Success: Pipeline cleared. Empty set emitted (0 records returned).</div>';
            return;
        }

        let viewHtml = '<div class="status-msg success">✔ Logged execution run context: Pipeline executed successfully.</div><table><thead><tr>';
        const headers = Object.keys(stream[0]);
        headers.forEach(h => { viewHtml += `<th>${h}</th>`; });
        viewHtml += '</tr></thead><tbody>';

        stream.forEach(row => {
            viewHtml += '<tr>';
            headers.forEach(h => { viewHtml += `<td class="mono">${row[h]}</td>`; });
            viewHtml += '</tr>';
        });
        viewHtml += '</tbody></table>';

        buffer.innerHTML = viewHtml;

    } catch (exception) {
        buffer.innerHTML = `<div class="status-msg error">Runtime Exception Caught: ${exception.message}</div>`;
    }
}

// Global exposes
window.loadTemplate = loadTemplate;
window.clearWorkspace = clearWorkspace;
window.runPipeline = runPipeline;
window.toggleTheme = toggleTheme;
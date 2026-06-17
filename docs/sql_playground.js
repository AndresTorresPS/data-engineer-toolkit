// SQL Playground client-side logic with English inline comments
// Mock database used for client-only query simulation
const mockDb = {
    // users table rows
    users: [
        { user_id: 1, name: 'Alice Smith', country: 'USA', signup_date: '2026-01-10' },
        { user_id: 2, name: 'Carlos Buendia', country: 'Colombia', signup_date: '2026-02-14' },
        { user_id: 3, name: 'Elena Rostova', country: 'Germany', signup_date: '2026-03-01' },
        { user_id: 4, name: 'David Lee', country: 'USA', signup_date: '2026-03-22' }
    ],
    // orders table rows
    orders: [
        { order_id: 101, user_id: 1, order_date: '2026-02-20', total_amount: 150.00 },
        { order_id: 102, user_id: 2, order_date: '2026-03-15', total_amount: 45.50 },
        { order_id: 103, user_id: 1, order_date: '2026-04-10', total_amount: 210.00 },
        { order_id: 104, user_id: 3, order_date: '2026-05-02', total_amount: 89.99 },
        { order_id: 105, user_id: 2, order_date: '2026-05-28', total_amount: 120.00 }
    ]
};

// Predefined code templates for the two challenges
const codeTemplates = {
    1: "SELECT order_id, user_id, order_date, total_amount\nFROM orders\nWHERE total_amount > 100 \n  AND order_date BETWEEN '2026-01-01' AND '2026-06-01'\nORDER BY total_amount DESC;",
    2: "SELECT u.country, COUNT(o.order_id) AS total_orders\nFROM users u\nJOIN orders o ON u.user_id = o.user_id\nGROUP BY u.country\nHAVING COUNT(o.order_id) > 1;"
};

// Load a template into the editor by id (1 or 2)
function loadTemplate(id) {
    // set the editor text to the selected template
    document.getElementById('editor').value = codeTemplates[id];
}

// Reset the editor and output buffer to their initial state
function clearWorkspace() {
    document.getElementById('editor').value = '';
    document.getElementById('output-buffer').innerHTML = '<span style="color: var(--text-muted); font-size: 14px;">Terminal standby. Awaiting query dispatch execution metrics...</span>';
}

// Execute a simplified client-side SQL pipeline against mockDb
function runPipeline() {
    // cache DOM nodes for performance
    const editorEl = document.getElementById('editor');
    const buffer = document.getElementById('output-buffer');

    // read and normalize the SQL input
    const rawSql = (editorEl.value || '').trim(); // original input
    if (!rawSql) { // early exit on empty input
        buffer.innerHTML = '<div class="status-msg error">Pipeline Fault: Command input is empty.</div>';
        return;
    }

    // use case-insensitive checks without mutating the original SQL
    const normalized = rawSql.toUpperCase();
    if (!/\bSELECT\b/i.test(normalized) || !/\bFROM\b/i.test(normalized)) {
        buffer.innerHTML = '<div class="status-msg error">Compilation Failure: Standard SQL commands require explicitly declared SELECT and FROM boundaries.</div>';
        return;
    }

    try {
        // resolve base stream depending on FROM / JOIN
        let stream = [];

        if (/\bJOIN\b/.test(normalized)) {
            // naive inner-join implementation: join users to orders on user_id
            mockDb.users.forEach(u => {
                mockDb.orders.forEach(o => {
                    if (u.user_id === o.user_id) stream.push(Object.assign({}, u, o));
                });
            });
        } else if (/FROM\s+USERS\b/.test(normalized)) {
            // clone users to avoid mutating mock data
            stream = typeof structuredClone === 'function' ? structuredClone(mockDb.users) : JSON.parse(JSON.stringify(mockDb.users));
        } else if (/FROM\s+ORDERS\b/.test(normalized)) {
            // clone orders
            stream = typeof structuredClone === 'function' ? structuredClone(mockDb.orders) : JSON.parse(JSON.stringify(mockDb.orders));
        } else {
            throw new Error("Invalid Object Model Context. Target catalog namespaces must resolve to 'users' or 'orders'.");
        }

        // apply WHERE filters (very limited SQL parsing; pattern matching)
        if (/\bWHERE\b/.test(normalized)) {
            if (/TOTAL_AMOUNT\s*>\s*100/.test(normalized)) {
                stream = stream.filter(r => (r.total_amount || 0) > 100);
            }
            if (/BETWEEN/.test(normalized)) {
                // keep date strings comparison simple (ISO-like date strings work lexicographically)
                stream = stream.filter(r => (r.order_date >= '2026-01-01' && r.order_date <= '2026-06-01'));
            }
        }

        // apply GROUP BY -> aggregate by country for the example
        if (/\bGROUP BY\b/.test(normalized)) {
            const groups = {};
            stream.forEach(item => {
                const key = item.country || 'Undefined';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            // transform groups into aggregated rows
            stream = Object.keys(groups).map(k => ({ country: k, total_orders: groups[k].length }));

            // apply HAVING > 1 when requested
            if (/\bHAVING\b/.test(normalized) && />\s*1/.test(normalized)) {
                stream = stream.filter(r => r.total_orders > 1);
            }
        }

        // support a simple ORDER BY total_amount DESC
        if (/\bORDER BY\b/.test(normalized)) {
            if (/TOTAL_AMOUNT/.test(normalized) && /DESC/.test(normalized)) {
                stream.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
            }
        }

        // render results or an empty success message
        if (stream.length === 0) {
            buffer.innerHTML = '<div class="status-msg success">Success: Pipeline cleared. Empty set emitted (0 records returned).</div>';
            return;
        }

        // construct HTML table from result rows
        let viewHtml = '<div class="status-msg success">✔ Logged execution run context: Pipeline executed successfully.</div><table><thead><tr>';
        const headers = Object.keys(stream[0]); // column headers inferred from first row
        headers.forEach(h => { viewHtml += `<th>${h}</th>`; });
        viewHtml += '</tr></thead><tbody>';

        stream.forEach(row => {
            viewHtml += '<tr>';
            headers.forEach(h => { viewHtml += `<td class="mono">${row[h]}</td>`; });
            viewHtml += '</tr>';
        });
        viewHtml += '</tbody></table>';

        buffer.innerHTML = viewHtml; // inject the final rendered output

    } catch (exception) {
        // surface runtime errors to the output buffer
        buffer.innerHTML = `<div class="status-msg error">Runtime Exception Caught: ${exception.message}</div>`;
    }
}

// Expose helpers to global scope intentionally for inline buttons (loadTemplate, runPipeline, clearWorkspace)
window.loadTemplate = loadTemplate;
window.clearWorkspace = clearWorkspace;
window.runPipeline = runPipeline;

const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.PORT || 3000;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'dev_questions.db');

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database open error:', err);
    process.exit(1);
  }
});

const createTableSql = `
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  question TEXT NOT NULL,
  optionA TEXT NOT NULL,
  optionB TEXT NOT NULL,
  optionC TEXT NOT NULL,
  optionD TEXT NOT NULL,
  correctOption TEXT NOT NULL
);`;

const seedDataSql = `
INSERT INTO questions (section, question, optionA, optionB, optionC, optionD, correctOption)
VALUES
  ('sec1', 'Which design choice most directly improves disaster recovery in a cloud architecture?',
   'Using a single availability zone only', 'Deploying across multiple regions with replicated data',
   'Running all services on one VM', 'Turning off backups to reduce cost', 'B'),
  ('sec1', 'What is the main purpose of a message queue in a distributed system?',
   'To replace databases', 'To increase CPU speed', 'To decouple services and buffer workloads',
   'To encrypt traffic', 'C'),
  ('sec1', 'Which principle best supports horizontal scalability?',
   'Using one large monolithic server', 'Designing services to run as stateless instances',
   'Storing all state in memory on one node', 'Avoiding automation', 'B'),
  ('sec1', 'Which service is most appropriate for serving static assets globally?',
   'Relational database', 'Virtual private network',
   'Content delivery network', 'Batch scheduler', 'C'),
  ('sec1', 'What does Infrastructure as Code primarily help with?',
   'Manual configuration only', 'Reproducible and versioned infrastructure deployment',
   'Reducing network bandwidth', 'Eliminating monitoring needs', 'B'),
  ('sec1', 'A load balancer is mainly used to:',
   'Store long-term backups', 'Replace application code',
   'Distribute traffic across healthy instances', 'Encrypt secrets', 'C'),
  ('sec1', 'Which practice best supports least-privilege access?',
   'Giving every user admin rights', 'Sharing one root account',
   'Assigning only the permissions required for a role', 'Disabling authentication', 'C'),
  ('sec1', 'Which storage pattern is typically best for high-throughput analytics workloads?',
   'Object storage with parallel access', 'Columnar data warehouse storage',
   'In-memory cache only', 'Flat text files on a single laptop', 'B'),
  ('sec1', 'What is the key benefit of autoscaling?',
   'It permanently removes the need for monitoring',
   'It replaces application testing', 'It adjusts capacity based on demand', 'It sets a fixed cost ceiling', 'C'),
  ('sec1', 'Which statement best describes a well-architected cloud system?',
   'It is only optimized for cost', 'It ignores resilience and security',
   'It prioritizes performance over all else',
   'It balances reliability, security, scalability, and cost', 'D');`;

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(createTableSql, (err) => {
        if (err) return reject(err);
        
        db.get('SELECT COUNT(*) AS count FROM questions', (selectError, row) => {
          if (selectError) return reject(selectError);
          
          if (row.count === 0) {
            db.run(seedDataSql, (insertError) => {
              if (insertError) return reject(insertError);
              console.log(`Seeded development questions into ${dbPath}`);
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// API Routes
app.get('/api/questions', (req, res) => {
  const section = req.query.section || 'sec1';
  const sql = 'SELECT * FROM questions WHERE section = ? ORDER BY id';
  db.all(sql, [section], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    res.json(rows);
  });
});

app.get('/api/questions/:id', (req, res) => {
  const sql = 'SELECT * FROM questions WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (!row) return res.status(404).json({ error: 'Question not found' });
    res.json(row);
  });
});

app.post('/api/questions', (req, res) => {
  const { section, question, optionA, optionB, optionC, optionD, correctOption } = req.body;
  if (!section || !question || !optionA || !optionB || !optionC || !optionD || !correctOption) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `INSERT INTO questions (section, question, optionA, optionB, optionC, optionD, correctOption) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [section, question, optionA, optionB, optionC, optionD, correctOption], function (err) {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    res.status(201).json({ id: this.lastID });
  });
});

app.put('/api/questions/:id', (req, res) => {
  const { section, question, optionA, optionB, optionC, optionD, correctOption } = req.body;
  if (!section || !question || !optionA || !optionB || !optionC || !optionD || !correctOption) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `UPDATE questions SET section = ?, question = ?, optionA = ?, optionB = ?, optionC = ?, optionD = ?, correctOption = ? WHERE id = ?`;
  db.run(sql, [section, question, optionA, optionB, optionC, optionD, correctOption, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ updated: true });
  });
});

app.delete('/api/questions/:id', (req, res) => {
  const sql = 'DELETE FROM questions WHERE id = ?';
  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    if (this.changes === 0) return res.status(404).json({ error: 'Question not found' });
    res.json({ deleted: true });
  });
});

// Initialize DB before listening
initDb().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});   
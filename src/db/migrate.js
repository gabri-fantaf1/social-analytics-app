const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Schema applicato con successo.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Errore durante la migrazione:', err);
  process.exit(1);
});

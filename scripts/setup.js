require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { seed } = require('./seed');
const { pool } = require('../src/db');
(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });
  try {
    await connection.query(fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8'));
    await seed();
    console.log('Base de datos Simple inicializada correctamente.');
  } finally {
    await connection.end();
    await pool.end();
  }
})().catch(error => {console.error('Error inicializando MySQL:', error.message); process.exit(1);});

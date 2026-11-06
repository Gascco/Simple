require('dotenv').config();
const mysql = require('mysql2/promise');
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Simple',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'local',
  charset: 'utf8mb4'
};
const pool = mysql.createPool(config);
module.exports = { mysql, pool, config };

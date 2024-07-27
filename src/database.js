const mysql = require('mysql2/promise');
const config = require('../config/config.json');

// Use createPool() for connection pooling, which is more efficient
const pool = mysql.createPool({
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME
});

// You can now use pool.query() to execute queries
module.exports = pool;

import mysql from 'mysql2/promise';

export async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // CRITICAL FIXES FOR AIVEN:
    port: Number(process.env.DB_PORT) || 3306, 
    ssl: {
      rejectUnauthorized: false
    }
  });
}
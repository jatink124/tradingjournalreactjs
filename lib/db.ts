import mysql from 'mysql2/promise';

const useSsl = process.env.DB_SSL === 'true';

export async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

export async function query(sql: string) {
  const conn = await createConnection();
  const [rows] = await conn.execute(sql);
  await conn.end();
  return rows;
}
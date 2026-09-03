import mysql from "mysql2/promise";

declare global {
  var mh3Pool: mysql.Pool | undefined;
}

export const db =
  global.mh3Pool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    charset: "utf8mb4",
  });

if (process.env.NODE_ENV !== "production") global.mh3Pool = db;

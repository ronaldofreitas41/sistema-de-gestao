import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";


const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não foi definida no arquivo .env");
}

const url = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT ?? 10000),
});

declare global {
  // eslint-disable-next-line no-var
  var mh3Prisma: PrismaClient | undefined;
}

export const prisma = global.mh3Prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.mh3Prisma = prisma;
}

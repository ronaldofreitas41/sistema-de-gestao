import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não foi definida no arquivo .env");
}

const secret = new TextEncoder().encode(JWT_SECRET);

export interface AuthPayload {
  usuarioId: string;
  empresaId: number | null;
  login: string;
  nome: string;
  perfil: string;
}

export async function createToken(payload: AuthPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}
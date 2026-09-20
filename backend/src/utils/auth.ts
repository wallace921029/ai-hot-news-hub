import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { env } from './env.js'

const SALT_ROUNDS = 10

export interface JWTPayload {
  userId: number
  username: string
  email: string
  role: 'admin' | 'user'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_SECRET) as JWTPayload
}

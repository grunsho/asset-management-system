import jwt from 'jsonwebtoken'

const getJwtSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const secret = process.env[name]
  if (!secret) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return secret
}

export const validateJwtSecrets = (): void => {
  for (const name of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const secret = process.env[name]
    if (!secret) {
      throw new Error(`${name} must be configured`)
    }
    if (process.env.NODE_ENV === 'production' && secret.length < 32) {
      throw new Error(`${name} must be configured with at least 32 characters`)
    }
  }
}

export interface TokenPayload {
  userId: string
  role: string
  permissions?: string[]
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getJwtSecret('JWT_SECRET'), { expiresIn: '15m' })
}

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getJwtSecret('JWT_REFRESH_SECRET'), {
    expiresIn: '7d',
  })
}

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret('JWT_SECRET')) as TokenPayload
}

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret('JWT_REFRESH_SECRET')) as TokenPayload
}

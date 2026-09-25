import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

interface ApiError extends Error {
  statusCode?: number
  code?: string
  details?: unknown
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const errorMiddleware = (
  error: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (res.headersSent) {
    return
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'La solicitud contiene datos inválidos',
      code: 'VALIDATION_ERROR',
      details: error.issues,
    })
  }

  if (error.name === 'SyntaxError' && 'body' in error) {
    return res.status(400).json({
      error: 'El cuerpo JSON no es válido',
      code: 'INVALID_JSON',
    })
  }

  if (
    error.name === 'JsonWebTokenError' ||
    error.name === 'TokenExpiredError'
  ) {
    return res.status(403).json({
      error: 'Refresh token inválido o expirado',
      code: 'INVALID_REFRESH_TOKEN',
    })
  }

  if (error.message === 'NOT_FOUND') {
    return res.status(404).json({
      error: 'Recurso no encontrado',
      code: 'NOT_FOUND',
    })
  }

  if (error.message === 'SAME_STATUS') {
    return res.status(400).json({
      error: 'El activo ya se encuentra en ese estado',
      code: 'SAME_STATUS',
    })
  }

  const prismaCode = (error as ApiError & { code?: string }).code
  if (prismaCode === 'P2002') {
    return res.status(409).json({
      error: 'Ya existe un registro con esos datos',
      code: 'CONFLICT',
      details: (error as ApiError & { meta?: { target?: unknown } }).meta
        ?.target,
    })
  }

  if (prismaCode === 'P2003' || prismaCode === 'P2014') {
    return res.status(409).json({
      error: 'La operación entra en conflicto con datos relacionados',
      code: 'RELATION_CONFLICT',
    })
  }

  if (prismaCode === 'P2025') {
    return res.status(404).json({
      error: 'Recurso no encontrado',
      code: 'NOT_FOUND',
    })
  }

  if (prismaCode === 'P2023') {
    return res.status(400).json({
      error: 'Uno de los identificadores no es válido',
      code: 'INVALID_ID',
    })
  }

  if (error.statusCode && error.code) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      ...(error.details === undefined ? {} : { details: error.details }),
    })
  }

  console.error('Error no controlado en la API:', error)
  return res.status(500).json({
    error: 'Error interno del servidor',
    code: 'INTERNAL_SERVER_ERROR',
  })
}

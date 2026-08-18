import { Request, Response } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { uploadToR2, UploadCategory } from '../../infrastructure/r2';
import { ValidationError, UnauthorizedError } from '../../core/AppError';
import { env } from '../../config/env';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error(`File type "${file.mimetype}" is not allowed`));
  },
});

const BodySchema = z.object({
  category: z.enum(['logos', 'proofs', 'services']),
});

export class UploadController extends BaseController {
  protected registerRoutes(): void {
    this.router.post('/', upload.single('file'), this.bind(this.uploadFile));
  }

  private async uploadFile(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new ValidationError('No file provided');

    const { category } = BodySchema.parse(req.body);

    // logos and service images are admin-only; proofs are uploaded by public clients.
    // This route runs before tenant resolution, so we can only verify the token's
    // signature here — not which tenant it belongs to.
    if (category !== 'proofs') {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) throw new UnauthorizedError('Authentication required');
      try {
        jwt.verify(token, env.JWT_SECRET);
      } catch {
        throw new UnauthorizedError('Invalid or expired token');
      }
    }

    const url = await uploadToR2(
      req.file.buffer,
      category as UploadCategory,
      req.file.originalname,
      req.file.mimetype,
    );

    this.ok(res, { url });
  }
}

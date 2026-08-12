import { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { uploadToR2, UploadCategory } from '../../infrastructure/r2';
import { ValidationError } from '../../core/AppError';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
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

    const url = await uploadToR2(
      req.file.buffer,
      category as UploadCategory,
      req.file.originalname,
      req.file.mimetype,
    );

    this.ok(res, { url });
  }
}

import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { AuthService } from './auth.service';
import { requireAuth } from '../../middleware/auth.middleware';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.post('/global-login', this.bind(this.globalLogin));
    this.router.post('/login', this.bind(this.login));
    this.router.get('/me', requireAuth, this.bind(this.me));
    this.router.delete('/me', requireAuth, this.bind(this.deleteAccount));
  }

  private async globalLogin(req: Request, res: Response): Promise<void> {
    const { email, password } = LoginSchema.parse(req.body);
    const result = await this.authService.globalLogin(email, password);
    this.ok(res, result);
  }

  private async login(req: Request, res: Response): Promise<void> {
    const { email, password } = LoginSchema.parse(req.body);
    const result = await this.authService.login(req.tenantId, email, password);
    this.ok(res, result);
  }

  private async me(req: Request, res: Response): Promise<void> {
    const result = await this.authService.getProfile(req.tenantUser!.id);
    this.ok(res, result);
  }

  private async deleteAccount(req: Request, res: Response): Promise<void> {
    await this.authService.deleteAccount(req.tenantUser!.id, req.tenantId, req.tenantUser!.role);
    this.noContent(res);
  }
}

import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { TenantUserService } from './tenantUser.service';
import { requireAuth } from '../../middleware/auth.middleware';

// Either an Expo push token (mobile app) or a Web Push subscription (admin-app PWA).
const RegisterPushTokenSchema = z.discriminatedUnion('platform', [
  z.object({
    platform: z.enum(['ios', 'android']),
    token: z.string().min(1),
  }),
  z.object({
    platform: z.literal('web'),
    subscription: z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }),
    }),
  }),
]);

export class TenantUserController extends BaseController {
  constructor(private readonly service: TenantUserService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.post('/me/push-token', requireAuth, this.bind(this.registerPushToken));
  }

  private async registerPushToken(req: Request, res: Response): Promise<void> {
    const dto = RegisterPushTokenSchema.parse(req.body);

    const data = await this.service.registerPushToken(
      dto.platform === 'web'
        ? {
            tenant_id: req.tenantId,
            tenant_user_id: req.tenantUser!.id,
            platform: 'web',
            token: dto.subscription.endpoint,
            p256dh: dto.subscription.keys.p256dh,
            auth: dto.subscription.keys.auth,
          }
        : {
            tenant_id: req.tenantId,
            tenant_user_id: req.tenantUser!.id,
            platform: dto.platform,
            token: dto.token,
          },
    );
    this.ok(res, data);
  }
}

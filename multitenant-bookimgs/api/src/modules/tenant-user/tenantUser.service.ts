import { PrismaClient, PushToken } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';

interface RegisterPushTokenDTO {
  tenant_id: string;
  tenant_user_id: string;
  token: string;
  platform: 'ios' | 'android';
}

export class TenantUserService extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async registerPushToken(data: RegisterPushTokenDTO): Promise<PushToken> {
    return this.db.pushToken.upsert({
      where: { tenant_user_id_token: { tenant_user_id: data.tenant_user_id, token: data.token } },
      create: {
        tenant_id: data.tenant_id,
        tenant_user_id: data.tenant_user_id,
        token: data.token,
        platform: data.platform,
      },
      update: { platform: data.platform },
    } as Parameters<typeof this.db.pushToken.upsert>[0]);
  }
}

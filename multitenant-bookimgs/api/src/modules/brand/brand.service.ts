import { PrismaClient, Brand } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { NotFoundError } from '../../core/AppError';

export class BrandService extends BaseRepository {
  constructor(db: PrismaClient) {
    super(db);
  }

  async list(): Promise<Brand[]> {
    return this.db.brand.findMany({ orderBy: { is_primary: 'desc' } });
  }

  async getById(id: string): Promise<Brand> {
    const brand = await this.db.brand.findFirst({ where: { id } });
    if (!brand) throw new NotFoundError('Brand');
    return brand;
  }

  async create(data: { name: string; logo_url?: string | null; description?: string; terms_conditions?: string; whatsapp_number?: string | null; is_primary?: boolean }): Promise<Brand> {
    return this.db.brand.create({
      data: {
        name: data.name,
        logo_url: data.logo_url ?? null,
        description: data.description ?? null,
        terms_conditions: data.terms_conditions ?? null,
        whatsapp_number: data.whatsapp_number ?? null,
        is_primary: data.is_primary ?? false,
      },
    } as Parameters<typeof this.db.brand.create>[0]);
  }

  async update(id: string, data: Partial<{ name: string; logo_url: string | null; description: string; terms_conditions: string; whatsapp_number: string | null; is_primary: boolean }>): Promise<Brand> {
    await this.getById(id);
    return this.db.brand.update({ where: { id }, data });
  }
}

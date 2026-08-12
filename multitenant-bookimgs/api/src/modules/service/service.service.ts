import { PrismaClient, DepositType } from '@prisma/client';
import { ServiceRepository } from './service.repository';
import { ValidationError } from '../../core/AppError';

interface CreateServiceDTO {
  brand_id: string;
  name: string;
  description?: string;
  image_url?: string | null;
  duration_minutes: number;
  price_amount: number;
  price_currency: string;
  deposit_type: DepositType;
  deposit_value: number;
}

interface UpdateServiceDTO extends Partial<CreateServiceDTO> {
  is_active?: boolean;
}

export class ServiceService {
  private readonly repo: ServiceRepository;

  constructor(db: PrismaClient) {
    this.repo = new ServiceRepository(db);
  }

  computeDepositAmount(priceAmount: number, depositType: DepositType, depositValue: number): number {
    if (depositType === 'PERCENTAGE') {
      return Math.round(priceAmount * depositValue / 100);
    }
    return depositValue;
  }

  async listServices(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async getService(id: string) {
    return this.repo.findById(id);
  }

  async createService(data: CreateServiceDTO) {
    if (data.price_amount < 0) throw new ValidationError('price_amount must be non-negative');
    if (data.deposit_value < 0) throw new ValidationError('deposit_value must be non-negative');
    if (data.deposit_type === 'PERCENTAGE' && (data.deposit_value < 1 || data.deposit_value > 100))
      throw new ValidationError('Deposit percentage must be 1–100');
    if (data.duration_minutes < 1) throw new ValidationError('duration_minutes must be ≥ 1');

    return this.repo.create({
      brand_id: data.brand_id,
      name: data.name,
      description: data.description ?? null,
      image_url: data.image_url ?? null,
      duration_minutes: data.duration_minutes,
      price_amount: data.price_amount,
      price_currency: data.price_currency,
      deposit_type: data.deposit_type,
      deposit_value: data.deposit_value,
      is_active: true,
    });
  }

  async updateService(id: string, data: UpdateServiceDTO) {
    return this.repo.update(id, data as Parameters<typeof this.repo.update>[1]);
  }

  async deleteService(id: string) {
    return this.repo.delete(id);
  }
}

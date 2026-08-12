import { Request, Response } from 'express';
import { z } from 'zod';
import { BaseController } from '../../core/BaseController';
import { BookingService } from './booking.service';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { normalizePhone } from '../../utils/phone';

const CreateBookingSchema = z.object({
  service_id: z.string().uuid(),
  slot_start: z.string().datetime(),
  customer: z.object({
    full_name: z.string().min(1),
    phone: z.string().min(6),
    email: z.string().email().optional(),
  }),
  client_notes: z.string().optional(),
});

const SubmitProofSchema = z.object({
  payment_source_id: z.string().uuid(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  client_reference: z.string().optional(),
  proof_url: z.string().url().optional(),
});

const ReviewSchema = z.object({
  payment_id: z.string().uuid(),
  rejection_reason: z.string().optional(),
});

export class BookingController extends BaseController {
  constructor(private readonly bookingService: BookingService) {
    super();
  }

  protected registerRoutes(): void {
    // Public
    this.router.post('/', this.bind(this.create));
    this.router.get('/ref/:code', this.bind(this.getByRef));
    this.router.post('/:id/proof', this.bind(this.submitProof));

    // Dashboard
    this.router.get('/', requireAuth, this.bind(this.list));
    this.router.get('/:id', requireAuth, this.bind(this.getById));
    this.router.post('/:id/confirm', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.confirm));
    this.router.post('/:id/reject', requireAuth, requireRole('TENANT_OWNER', 'TENANT_STAFF'), this.bind(this.reject));
    this.router.post('/:id/cancel', requireAuth, this.bind(this.cancel));
  }

  private async create(req: Request, res: Response): Promise<void> {
    const dto = CreateBookingSchema.parse(req.body);
    const result = await this.bookingService.createBooking({
      tenantId: req.tenantId,
      timezone: req.tenant.timezone,
      slotHoldMinutes: req.tenant.slot_hold_minutes,
      serviceId: dto.service_id,
      slotStart: new Date(dto.slot_start),
      customer: {
        ...dto.customer,
        phone: normalizePhone(dto.customer.phone, req.tenant.country_code),
      },
      clientNotes: dto.client_notes,
    });
    this.created(res, result);
  }

  private async getByRef(req: Request, res: Response): Promise<void> {
    const data = await this.bookingService.getBookingByRef(req.params['code'] as string);
    this.ok(res, data);
  }

  private async getById(req: Request, res: Response): Promise<void> {
    const data = await this.bookingService.getBookingById(req.params['id'] as string);
    this.ok(res, data);
  }

  private async submitProof(req: Request, res: Response): Promise<void> {
    const dto = SubmitProofSchema.parse(req.body);
    const data = await this.bookingService.submitProof({
      tenantId: req.tenantId,
      bookingId: req.params['id'] as string,
      paymentSourceId: dto.payment_source_id,
      amount: dto.amount,
      currency: dto.currency,
      clientReference: dto.client_reference,
      proofUrl: dto.proof_url,
    });
    this.ok(res, data);
  }

  private async list(req: Request, res: Response): Promise<void> {
    const status = req.query['status'] as string | undefined;
    const data = await this.bookingService.listBookings({
      status: status as Parameters<typeof this.bookingService.listBookings>[0]['status'],
    });
    this.ok(res, data);
  }

  private async confirm(req: Request, res: Response): Promise<void> {
    const { payment_id } = ReviewSchema.parse(req.body);
    await this.bookingService.confirmBooking({
      tenantId: req.tenantId,
      bookingId: req.params['id'] as string,
      paymentId: payment_id!,
      reviewerUserId: req.tenantUser!.id,
    });
    this.noContent(res);
  }

  private async reject(req: Request, res: Response): Promise<void> {
    const { payment_id, rejection_reason } = ReviewSchema.parse(req.body);
    if (!rejection_reason) throw new Error('rejection_reason required');
    await this.bookingService.rejectBooking({
      tenantId: req.tenantId,
      bookingId: req.params['id'] as string,
      paymentId: payment_id!,
      reviewerUserId: req.tenantUser!.id,
      rejectionReason: rejection_reason,
    });
    this.noContent(res);
  }

  private async cancel(req: Request, res: Response): Promise<void> {
    await this.bookingService.cancelBooking({ bookingId: req.params['id'] as string });
    this.noContent(res);
  }
}

import { Request, Response, Router } from 'express';
import { BillingService } from './billing.service';

export function createWebhookRouter(): Router {
  const router = Router();
  const billingService = new BillingService();

  // Paystack sends the raw body — we must read it before JSON parsing strips it.
  // Mount this route BEFORE express.json() in app.ts by registering it early,
  // or use express.raw() here to capture the raw buffer.
  router.post(
    '/paystack',
    // Capture raw body for HMAC verification
    (req, res, next) => {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => { raw += chunk; });
      req.on('end', () => {
        (req as Request & { rawBody: string }).rawBody = raw;
        next();
      });
    },
    async (req: Request, res: Response) => {
      const signature = req.headers['x-paystack-signature'] as string | undefined;
      const rawBody = (req as Request & { rawBody: string }).rawBody ?? '';

      try {
        await billingService.handleWebhook(rawBody, signature ?? '');
      } catch (err) {
        console.error('[webhook] error:', err);
      }

      res.sendStatus(200);
    },
  );

  return router;
}

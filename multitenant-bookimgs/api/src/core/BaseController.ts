import { Router, Request, Response, NextFunction } from 'express';

export abstract class BaseController {
  public readonly router: Router;

  constructor() {
    this.router = Router();
    this.registerRoutes();
  }

  protected abstract registerRoutes(): void;

  protected ok<T>(res: Response, data?: T, statusCode = 200): void {
    res.status(statusCode).json({ success: true, data });
  }

  protected created<T>(res: Response, data?: T): void {
    res.status(201).json({ success: true, data });
  }

  protected noContent(res: Response): void {
    res.status(204).send();
  }

  // Convenience to bind class methods as route handlers (preserves `this`)
  protected bind<T extends BaseController>(
    method: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  ) {
    return method.bind(this);
  }
}

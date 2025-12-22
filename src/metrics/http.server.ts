import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import { MetricsService } from './metrics.service';
import { HealthService } from './health.service';
import { appConfig } from '../utils/config';
import { log } from '../utils/logger';

export interface HttpServerConfig {
  metricsService: MetricsService;
  healthService: HealthService;
  port?: number;
  metricsPath?: string;
  healthPath?: string;
}

export class HttpServer {
  private readonly app: Express;
  private server: Server | null = null;
  private readonly metricsService: MetricsService;
  private readonly healthService: HealthService;
  private readonly port: number;
  private readonly metricsPath: string;
  private readonly healthPath: string;

  constructor(config: HttpServerConfig) {
    this.metricsService = config.metricsService;
    this.healthService = config.healthService;
    this.port = config.port ?? appConfig.metricsPort;
    this.metricsPath = config.metricsPath ?? appConfig.metricsPath;
    this.healthPath = config.healthPath ?? appConfig.healthPath;

    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Root endpoint - service info
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        service: 'via-bridge-relayer',
        version: process.env.npm_package_version || '1.0.0',
        endpoints: {
          metrics: this.metricsPath,
          health: this.healthPath,
          liveness: '/livez',
          readiness: '/readyz',
        },
      });
    });

    // Prometheus metrics endpoint
    this.app.get(this.metricsPath, async (_req: Request, res: Response) => {
      try {
        const metrics = await this.metricsService.getMetrics();
        res.set('Content-Type', this.metricsService.getContentType());
        res.send(metrics);
      } catch (error) {
        log.error('Error serving metrics:', error);
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    // Detailed health check endpoint
    this.app.get(this.healthPath, async (_req: Request, res: Response) => {
      try {
        const health = await this.healthService.checkHealth();
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        log.error('Error checking health:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Kubernetes liveness probe
    this.app.get('/livez', async (_req: Request, res: Response) => {
      try {
        const liveness = await this.healthService.checkLiveness();
        res.status(200).json(liveness);
      } catch {
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Kubernetes readiness probe
    this.app.get('/readyz', async (_req: Request, res: Response) => {
      try {
        const readiness = await this.healthService.checkReadiness();
        const statusCode = readiness.ready ? 200 : 503;
        res.status(statusCode).json(readiness);
      } catch (error) {
        res.status(503).json({
          ready: false,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          log.info(`HTTP server started on port ${this.port}`);
          log.info(`  Metrics: http://localhost:${this.port}${this.metricsPath}`);
          log.info(`  Health:  http://localhost:${this.port}${this.healthPath}`);
          log.info(`  Liveness: http://localhost:${this.port}/livez`);
          log.info(`  Readiness: http://localhost:${this.port}/readyz`);
          resolve();
        });

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            log.error(`Port ${this.port} is already in use`);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          log.error('Error stopping HTTP server:', error);
          reject(error);
        } else {
          log.info('HTTP server stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }

  public getPort(): number {
    return this.port;
  }
}

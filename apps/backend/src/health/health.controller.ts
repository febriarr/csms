import { SkipTransform } from '@/common/decorators/skip_transform.decorator';
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { HealthService, type HealthReport } from './health.service';

/**
 * For uptime monitors and load balancers, so it needs no session, is not rate limited, and answers in its own plain
 * shape (not wrapped in `{ success, data }`): a monitor only looks at the status code, 503 when the database is down.
 */
@Controller('health')
@AllowAnonymous()
@SkipThrottle()
@SkipTransform()
export class HealthController {
    constructor(private readonly health: HealthService) {}

    @Get()
    async check(@Res({ passthrough: true }) response: Response): Promise<HealthReport> {
        const report = await this.health.check();

        if (report.status === 'down') response.status(HttpStatus.SERVICE_UNAVAILABLE);

        return report;
    }
}

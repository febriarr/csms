import { Controller, Get, Query } from '@nestjs/common';
import {
    diagnosticsDetailQuerySchema,
    diagnosticsReportQuerySchema,
    type DiagnosticsDetailQuery,
    type DiagnosticsReportQuery,
} from '@workspace/validator';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { DiagnosticService } from './diagnostic.service';

@Controller('diagnostic')
export class DiagnosticController {
    constructor(private readonly diagnosticService: DiagnosticService) {}

    @Get('summary')
    summary(@Query(new ZodValidationPipe(diagnosticsReportQuerySchema)) query: DiagnosticsReportQuery) {
        return this.diagnosticService.summary(query);
    }

    @Get('today')
    today() {
        return this.diagnosticService.today();
    }

    @Get('trend')
    trend(@Query(new ZodValidationPipe(diagnosticsReportQuerySchema)) query: DiagnosticsReportQuery) {
        return this.diagnosticService.trend(query);
    }

    @Get('detail')
    detail(@Query(new ZodValidationPipe(diagnosticsDetailQuerySchema)) query: DiagnosticsDetailQuery) {
        return this.diagnosticService.detail(query);
    }
}

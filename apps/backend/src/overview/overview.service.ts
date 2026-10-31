import { todayRangeInAppTimezone } from '@/common/utils/app_timezone';
import { DeviceService } from '@/device/device.service';
import { DiagnosticService } from '@/diagnostic/diagnostic.service';
import { WhatsappService } from '@/whatsapp/whatsapp.service';
import { Injectable } from '@nestjs/common';
import type { Overview } from '@workspace/shared';
import { OverviewRepository } from './overview.repository';
import { DIAGNOSTICS_LIMIT, NEEDS_ATTENTION_LIMIT, PAUSE_LIMIT, PROBLEM_COLD_STORAGE_LIMIT } from './overview.type';
import { OverviewUtils } from './overview.utils';

/**
 * Everything the Overview page shows, in one call. The queries are independent, so they run together; the device
 * list is the same one the Live page reads, so both pages always agree on what is critical, paused or offline.
 */
@Injectable()
export class OverviewService {
    constructor(
        private readonly repo: OverviewRepository,
        private readonly devices: DeviceService,
        private readonly diagnostics: DiagnosticService,
        private readonly whatsapp: WhatsappService,
    ) {}

    async get(now: Date = new Date()): Promise<Overview> {
        const chartFrom = OverviewUtils.chartStart(now);

        const [devices, openByState, needsAttention, perHour, notificationRows, diagnosticsToday, pauses] =
            await Promise.all([
                this.devices.findAll({}),
                this.repo.countOpenAlerts(),
                this.repo.findOpenAlerts(NEEDS_ATTENTION_LIMIT),
                this.repo.countAlertsPerHour({ from: chartFrom, to: now }),
                this.repo.countNotifications(todayRangeInAppTimezone(now)),
                this.diagnostics.today(),
                this.repo.findCurrentPauses(now, PAUSE_LIMIT),
            ]);

        const { enabled, connected } = this.whatsapp.getStatus();

        return {
            generatedAt: now,
            devices: OverviewUtils.countDevices(devices),
            openAlerts: OverviewUtils.toOpenAlertCounts(openByState),
            needsAttention,
            problemColdStorages: OverviewUtils.rankProblemColdStorages(devices, PROBLEM_COLD_STORAGE_LIMIT),
            alertsLast24h: OverviewUtils.fillAlertBuckets(perHour, now),
            notifications: {
                today: OverviewUtils.toNotificationCounts(notificationRows),
                whatsapp: { enabled, connected },
            },
            diagnostics: {
                affectedDevices: diagnosticsToday.items.length,
                top: diagnosticsToday.items.slice(0, DIAGNOSTICS_LIMIT),
            },
            pauses: pauses.map((pause) => OverviewUtils.toOverviewPause(pause, now)),
        };
    }
}

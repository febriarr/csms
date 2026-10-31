import type {
    DeviceView,
    MonitoringPauseView,
    OverviewAlertBucket,
    OverviewDevices,
    OverviewNotificationCounts,
    OverviewOpenAlertCounts,
    OverviewPause,
    OverviewProblemColdStorage,
    PauseTimeline,
} from '@workspace/shared';
import type { DeviceState } from '@workspace/validator';
import {
    ACTIONABLE_STATES,
    ALERT_CHART_HOURS,
    type ActionableState,
    type AlertPerHourRow,
    type NotificationStatusRow,
    type OpenAlertRow,
} from './overview.type';

const MS_PER_HOUR = 3_600_000;

/** Most urgent first. Same order as the Live page, restricted to the states that are a problem. */
const PROBLEM_RANK: Record<ActionableState, number> = { CRITICAL: 0, WARNING: 1, OFFLINE: 2 };

const isActionable = (state: DeviceState): state is ActionableState => state in PROBLEM_RANK;

/** A device whose state counts: monitored, and not in a planned pause. The Live page uses the same rule. */
const isEvaluated = (device: DeviceView): boolean => device.isActive && device.monitoring.status !== 'PAUSED';

export class OverviewUtils {
    static countDevices(devices: DeviceView[]): OverviewDevices {
        const byState: Record<DeviceState, number> = { NORMAL: 0, DEFROST: 0, WARNING: 0, CRITICAL: 0, OFFLINE: 0 };
        let paused = 0;
        let inactive = 0;
        let monitored = 0;
        let online = 0;

        for (const device of devices) {
            if (device.isActive) {
                monitored += 1;

                if (device.state !== 'OFFLINE') online += 1;
            }

            // the Live page checks the pause first, so a paused device is never counted as inactive or by state
            if (device.monitoring.status === 'PAUSED') {
                paused += 1;
                continue;
            }

            if (!device.isActive) {
                inactive += 1;
                continue;
            }

            byState[device.state] += 1;
        }

        return { total: devices.length, byState, paused, inactive, online, monitored };
    }

    /**
     * The cold rooms that are not fine, worst first: the room is as bad as its worst device, more problem devices
     * come before fewer, then by name. A cold room with only healthy, paused or inactive devices is not listed.
     */
    static rankProblemColdStorages(devices: DeviceView[], limit: number): OverviewProblemColdStorage[] {
        const byColdStorage = new Map<string, DeviceView[]>();

        for (const device of devices) {
            const list = byColdStorage.get(device.coldStorageId);

            if (list) list.push(device);
            else byColdStorage.set(device.coldStorageId, [device]);
        }

        const rooms: OverviewProblemColdStorage[] = [];

        for (const members of byColdStorage.values()) {
            const problems = members.filter((device) => isEvaluated(device) && isActionable(device.state));

            if (problems.length === 0) continue;

            const sorted = [...problems].sort(
                (a, b) =>
                    PROBLEM_RANK[a.state as ActionableState] - PROBLEM_RANK[b.state as ActionableState] ||
                    OverviewUtils.hottestFirst(a, b),
            );
            const worst = sorted[0];

            rooms.push({
                id: worst.coldStorageId,
                name: worst.coldStorageName,
                locationName: worst.locationName,
                worstState: worst.state,
                deviceCount: members.length,
                problemDeviceCount: problems.length,
                worstDevice: {
                    id: worst.id,
                    code: worst.code,
                    name: worst.name,
                    temperature: worst.lastTemperature,
                    warningThreshold: worst.warningThreshold,
                    criticalThreshold: worst.criticalThreshold,
                    stateChangedAt: worst.stateChangedAt,
                },
            });
        }

        return rooms
            .sort(
                (a, b) =>
                    PROBLEM_RANK[a.worstState as ActionableState] - PROBLEM_RANK[b.worstState as ActionableState] ||
                    b.problemDeviceCount - a.problemDeviceCount ||
                    a.name.localeCompare(b.name),
            )
            .slice(0, limit);
    }

    /** Hottest reading first, a device without a reading last, then the one that has been in this state longest. */
    private static hottestFirst(a: DeviceView, b: DeviceView): number {
        if (a.lastTemperature !== b.lastTemperature) {
            if (a.lastTemperature === null) return 1;
            if (b.lastTemperature === null) return -1;

            return b.lastTemperature - a.lastTemperature;
        }

        return new Date(a.stateChangedAt).getTime() - new Date(b.stateChangedAt).getTime();
    }

    static toOpenAlertCounts(rows: OpenAlertRow[]): OverviewOpenAlertCounts {
        const counts: OverviewOpenAlertCounts = { total: 0, critical: 0, warning: 0, offline: 0 };

        for (const { toState, total } of rows) {
            if (!ACTIONABLE_STATES.includes(toState as ActionableState)) continue;

            counts[toState.toLowerCase() as 'critical' | 'warning' | 'offline'] += total;
            counts.total += total;
        }

        return counts;
    }

    /** The first hour the chart shows: the start of the current hour, minus the hours before it. */
    static chartStart(now: Date): Date {
        const currentHour = Math.floor(now.getTime() / MS_PER_HOUR) * MS_PER_HOUR;

        return new Date(currentHour - (ALERT_CHART_HOURS - 1) * MS_PER_HOUR);
    }

    /** One bucket per hour from `chartStart`, also for hours without alerts, so the chart has no gaps. */
    static fillAlertBuckets(rows: AlertPerHourRow[], now: Date): OverviewAlertBucket[] {
        const start = OverviewUtils.chartStart(now).getTime();
        const buckets: OverviewAlertBucket[] = Array.from({ length: ALERT_CHART_HOURS }, (_, index) => ({
            hour: new Date(start + index * MS_PER_HOUR),
            warning: 0,
            critical: 0,
            offline: 0,
        }));

        for (const { hour, toState, total } of rows) {
            const index = Math.round((hour.getTime() - start) / MS_PER_HOUR);
            const bucket = buckets[index];

            if (!bucket || !ACTIONABLE_STATES.includes(toState as ActionableState)) continue;

            bucket[toState.toLowerCase() as 'critical' | 'warning' | 'offline'] += total;
        }

        return buckets;
    }

    static toNotificationCounts(rows: NotificationStatusRow[]): OverviewNotificationCounts {
        const counts: OverviewNotificationCounts = { pending: 0, success: 0, failed: 0 };

        for (const { status, total } of rows) counts[status.toLowerCase() as keyof OverviewNotificationCounts] += total;

        return counts;
    }

    static pauseTimeline(pause: { startsAt: Date }, now: Date): PauseTimeline {
        return pause.startsAt > now ? 'SCHEDULED' : 'ACTIVE';
    }

    static toOverviewPause(
        row: Pick<
            MonitoringPauseView,
            'id' | 'kind' | 'startsAt' | 'endsAt' | 'note' | 'deviceName' | 'coldStorageName'
        >,
        now: Date,
    ): OverviewPause {
        return {
            id: row.id,
            kind: row.kind,
            timeline: OverviewUtils.pauseTimeline(row, now),
            targetName: row.deviceName ?? row.coldStorageName ?? '-',
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            note: row.note,
        };
    }
}

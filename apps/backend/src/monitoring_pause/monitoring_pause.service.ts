import { BusinessRuleException, EntityNotFoundException } from '@/common/exception/app.exception';
import { DatabaseTransaction } from '@/database/database.type';
import { Injectable } from '@nestjs/common';
import type { CreatePauseInput, EndPauseInput, PauseQuery } from '@workspace/validator';
import { MonitoringPauseRepository } from './monitoring_pause.repository';
import type { ExpiredPause, MonitoringPauseView, PauseTimeline, SuppressingPause } from '@workspace/shared';

@Injectable()
export class MonitoringPauseService {
    constructor(private readonly repo: MonitoringPauseRepository) {}

    async findAll(query: PauseQuery): Promise<MonitoringPauseView[]> {
        const now = new Date();
        const rows = await this.repo.findMany(query);

        return rows.map((row) => ({ ...row, timeline: this.timelineOf(row, now) }));
    }

    /**
     * Starts (or schedules) a pause. No state changes: while a pause runs, the telemetry service keeps storing
     * readings but raises no alerts for the target.
     */
    async create(input: CreatePauseInput, userId: string): Promise<MonitoringPauseView> {
        const target = { deviceId: input.deviceId, coldStorageId: input.coldStorageId };

        if (!(await this.repo.targetExists(target))) {
            throw input.deviceId
                ? new EntityNotFoundException('Device', input.deviceId)
                : new EntityNotFoundException('Cold storage', input.coldStorageId);
        }

        const created = await this.repo.create({
            deviceId: input.deviceId ?? null,
            coldStorageId: input.coldStorageId ?? null,
            kind: input.kind,
            startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
            maxPulldownMinutes: input.maxPulldownMinutes,
            note: input.note ?? null,
            createdBy: userId,
        });

        return this.getView(created.id);
    }

    /**
     * Ends a pause now (or at the given time). Only a pause that is still open can be ended, and only earlier than
     * it was going to end: this never extends a pause.
     */
    async end(id: string, input: EndPauseInput, userId: string): Promise<MonitoringPauseView> {
        const pause = await this.repo.findOne(id);

        if (!pause) throw new EntityNotFoundException('Pause', id);

        const now = new Date();
        const endsAt = input.endsAt ? new Date(input.endsAt) : now;

        if (pause.endsAt !== null && pause.endsAt <= now) {
            throw new BusinessRuleException('Pause sudah berakhir');
        }

        if (endsAt <= pause.startsAt) {
            throw new BusinessRuleException(
                'Waktu selesai harus setelah waktu mulai. Hapus pause jika belum dimulai dan tidak jadi dipakai',
            );
        }

        if (pause.endsAt !== null && endsAt >= pause.endsAt) {
            throw new BusinessRuleException(
                'Waktu selesai yang baru harus lebih awal dari waktu selesai yang sekarang',
            );
        }

        const note = [pause.note, input.note].filter((part): part is string => Boolean(part)).join('\n') || null;
        const ended = await this.repo.end(id, { endsAt, endedBy: userId, note });

        // someone ended it between the read above and the update
        if (!ended) throw new BusinessRuleException('Pause sudah berakhir');

        return this.getView(id);
    }

    /** Removes a pause that never started (a cancelled schedule). A pause that ran is part of the audit trail. */
    async remove(id: string): Promise<void> {
        if (await this.repo.destroyNotStarted(id, new Date())) return;

        const pause = await this.repo.findOne(id);

        if (!pause) throw new EntityNotFoundException('Pause', id);

        throw new BusinessRuleException(
            'Pause yang sudah dimulai tidak dapat dihapus karena menjadi bagian dari riwayat. Akhiri pause tersebut',
        );
    }

    /** Whether alerts for the device are suppressed at `at`. See the repository for the exact rule. */
    async isPaused(deviceId: string, at: Date, tx?: DatabaseTransaction): Promise<boolean> {
        const suppressing = await this.repo.findSuppressing([deviceId], at, tx);

        return suppressing.length > 0;
    }

    /** For a list of devices at once; a device that is both PAUSED and PULLING_DOWN reports PAUSED. */
    async findSuppressing(deviceIds: string[], at: Date): Promise<Map<string, SuppressingPause>> {
        const rows = await this.repo.findSuppressing(deviceIds, at);
        const byDevice = new Map<string, SuppressingPause>();

        for (const row of rows) {
            const known = byDevice.get(row.deviceId);

            if (!known || (known.phase === 'PULLING_DOWN' && row.phase === 'PAUSED')) byDevice.set(row.deviceId, row);
        }

        return byDevice;
    }

    findJustExpired(
        target: { deviceId: string; coldStorageId: string },
        at: Date,
        tx?: DatabaseTransaction,
    ): Promise<ExpiredPause | null> {
        return this.repo.findJustExpired(target, at, tx);
    }

    private async getView(id: string): Promise<MonitoringPauseView> {
        const row = await this.repo.findOneWithTarget(id);

        if (!row) throw new EntityNotFoundException('Pause', id);

        return { ...row, timeline: this.timelineOf(row, new Date()) };
    }

    private timelineOf(pause: { startsAt: Date; endsAt: Date | null }, now: Date): PauseTimeline {
        if (pause.startsAt > now) return 'SCHEDULED';

        return pause.endsAt === null || pause.endsAt > now ? 'ACTIVE' : 'ENDED';
    }
}

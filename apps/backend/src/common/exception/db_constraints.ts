import { ErrorCode } from '@workspace/shared';

/**
 * Everything the API knows about the database's named constraints, in one place. When a query violates one of
 * them PostgreSQL reports its name, and the filter turns it into a message the user can act on instead of a 500.
 * Unknown constraints still get a safe generic answer (see error_mapper.ts), so a missing entry is never fatal.
 *
 * Keep the names in sync with src/database/schema. Drizzle names unique columns `{table}_{column}_unique`.
 */
export type ConstraintRule = {
    code: ErrorCode;
    message: string;
    /** Form field to highlight, when the violation belongs to one input. */
    field?: string;
};

export const UNIQUE_CONSTRAINTS: Record<string, ConstraintRule> = {
    devices_code_active_uidx: {
        code: ErrorCode.DEVICE_CODE_TAKEN,
        message: 'Kode device sudah digunakan',
        field: 'code',
    },
    devices_storage_point_uidx: {
        code: ErrorCode.DEVICE_POINT_TAKEN,
        message: 'Titik ini sudah dipakai device lain di cold storage yang sama',
        field: 'pointLabel',
    },
    cold_storages_location_name_uidx: {
        code: ErrorCode.COLD_STORAGE_NAME_TAKEN,
        message: 'Nama cold storage sudah digunakan di lokasi ini',
        field: 'name',
    },
    divisions_name_unique: {
        code: ErrorCode.DIVISION_NAME_TAKEN,
        message: 'Nama divisi sudah digunakan',
        field: 'name',
    },
    locations_name_unique: {
        code: ErrorCode.LOCATION_NAME_TAKEN,
        message: 'Nama lokasi sudah digunakan',
        field: 'name',
    },
    notification_recipients_channel_target_uidx: {
        code: ErrorCode.RECIPIENT_TARGET_TAKEN,
        message: 'Target ini sudah terdaftar pada channel yang sama',
        field: 'target',
    },
    notification_subscriptions_target_uniq: {
        code: ErrorCode.SUBSCRIPTION_DUPLICATE,
        message: 'Langganan ini sudah ada',
    },
    // Ingest uses ON CONFLICT DO NOTHING, so these should never surface; they are a safety net.
    temperature_logs_device_id_recorded_at_pk: {
        code: ErrorCode.DUPLICATE_ENTITY,
        message: 'Data suhu pada waktu tersebut sudah ada',
    },
    device_diagnostics_logs_device_recorded_uidx: {
        code: ErrorCode.DUPLICATE_ENTITY,
        message: 'Data diagnostics pada waktu tersebut sudah ada',
    },
    // Better Auth tables
    user_email_unique: { code: ErrorCode.EMAIL_TAKEN, message: 'Email sudah digunakan', field: 'email' },
    user_username_unique: { code: ErrorCode.USERNAME_TAKEN, message: 'Username sudah digunakan', field: 'username' },
};

export const CHECK_CONSTRAINTS: Record<string, ConstraintRule> = {
    devices_threshold_order_chk: {
        code: ErrorCode.INVALID_THRESHOLD_ORDER,
        message: 'Urutan batas suhu harus defrost < warning < critical',
        field: 'warningThreshold',
    },
    devices_heartbeat_chk: {
        code: ErrorCode.INVALID_INPUT,
        message: 'Interval heartbeat harus lebih dari 0',
        field: 'heartbeatIntervalSeconds',
    },
    monitoring_pauses_one_target_chk: {
        code: ErrorCode.INVALID_PAUSE_TARGET,
        message: 'Pilih tepat satu target: device atau cold storage',
        field: 'deviceId',
    },
    monitoring_pauses_range_chk: {
        code: ErrorCode.INVALID_PAUSE_RANGE,
        message: 'Waktu selesai harus setelah waktu mulai',
        field: 'endsAt',
    },
    monitoring_pauses_pulldown_chk: {
        code: ErrorCode.INVALID_INPUT,
        message: 'Batas waktu pull-down tidak boleh negatif',
        field: 'maxPulldownMinutes',
    },
    notification_subscriptions_scope_chk: {
        code: ErrorCode.INVALID_SUBSCRIPTION_SCOPE,
        message: 'Cakupan langganan tidak sesuai dengan target yang dipilih',
    },
    device_diagnostics_logs_counts_chk: {
        code: ErrorCode.INVALID_INPUT,
        message: 'Jumlah kegagalan tidak boleh negatif',
    },
};

/**
 * For "cannot delete, still referenced": PostgreSQL reports the REFERENCING table, which is what the user needs
 * to hear about ("masih dipakai oleh device").
 */
export const TABLE_LABELS: Record<string, string> = {
    locations: 'lokasi',
    cold_storages: 'cold storage',
    devices: 'device',
    monitoring_pauses: 'jadwal pause',
    temperature_logs: 'data suhu',
    device_diagnostics_logs: 'data diagnostics',
    alerts: 'riwayat alert',
    notification_recipients: 'penerima notifikasi',
    notification_subscriptions: 'langganan notifikasi',
    notification_logs: 'log notifikasi',
};

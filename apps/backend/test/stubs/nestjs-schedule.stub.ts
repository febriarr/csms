const noopDecorator = (): MethodDecorator => () => undefined;

export const Cron = noopDecorator;
export const Interval = noopDecorator;
export const Timeout = noopDecorator;

// CronExpression.EVERY_MINUTE etc. only need to be some string in tests
export const CronExpression = new Proxy(
    {},
    {
        get: (_target, key) => String(key),
    },
);

export class SchedulerRegistry {}
export class ScheduleModule {
    static forRoot() {
        return ScheduleModule;
    }
}

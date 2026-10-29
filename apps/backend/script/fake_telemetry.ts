const API_URL = 'http://localhost:3000/api/temperature';
const DEVICE_KEY_HEADER = 'x-device-key';

const DEVICE_API_KEY = 'b4bd79bcef973a4aeb3dbdea4d32152c19f319f4cff50bbb805b0027b615093e';

const INTERVAL_MS = 30_000;
const JITTER_MS = 2_000;

type Scenario = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

type Device = {
    deviceCode: string;
    initialOffsetMs: number;
    scenario: Scenario;
    scenarioStartedAt: number | null;
    scenarioUntil: number | null;
    nextScenarioAt: number | null;
};

const devices: Device[] = [
    {
        deviceCode: '1011',
        initialOffsetMs: 0,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
    {
        deviceCode: '1012',
        initialOffsetMs: 3_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
    {
        deviceCode: '2021',
        initialOffsetMs: 7_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: Date.now() + 5 * 60_000,
    },
    {
        deviceCode: '2022',
        initialOffsetMs: 11_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: Date.now() + 10 * 60_000,
    },
    {
        deviceCode: '3031',
        initialOffsetMs: 16_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: Date.now() + 15 * 60_000,
    },
    {
        deviceCode: '3032',
        initialOffsetMs: 21_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
    {
        deviceCode: '4041',
        initialOffsetMs: 25_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
    {
        deviceCode: '4042',
        initialOffsetMs: 30_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
    {
        deviceCode: '5051',
        initialOffsetMs: 34_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
    {
        deviceCode: '5052',
        initialOffsetMs: 39_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
    {
        deviceCode: '5053',
        initialOffsetMs: 44_000,
        scenario: 'NORMAL',
        scenarioStartedAt: null,
        scenarioUntil: null,
        nextScenarioAt: null,
    },
];

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function randomJitter() {
    return Math.floor(Math.random() * (JITTER_MS * 2 + 1)) - JITTER_MS;
}

function randomNormalTemperature() {
    return Number(randomBetween(-28, -18.5).toFixed(2));
}

function randomWarningTemperature() {
    return Number(randomBetween(-5, -3.01).toFixed(2));
}

function randomCriticalTemperature() {
    return Number(randomBetween(-3, -1).toFixed(2));
}

function getTemperature(device: Device) {
    switch (device.scenario) {
        case 'WARNING':
            return randomWarningTemperature();

        case 'CRITICAL':
            return randomCriticalTemperature();

        case 'NORMAL':
        case 'OFFLINE':
        default:
            return randomNormalTemperature();
    }
}

function startScenario(device: Device, scenario: Scenario, durationMs: number) {
    const now = Date.now();

    device.scenario = scenario;
    device.scenarioStartedAt = now;
    device.scenarioUntil = now + durationMs;

    console.log(`[${new Date().toISOString()}]`, device.deviceCode, `SCENARIO ${scenario}`);
}

function updateScenario(device: Device) {
    const now = Date.now();

    if (device.scenario !== 'NORMAL' && device.scenarioUntil !== null && now >= device.scenarioUntil) {
        console.log(`[${new Date().toISOString()}]`, device.deviceCode, `SCENARIO ${device.scenario} ENDED`);

        device.scenario = 'NORMAL';
        device.scenarioStartedAt = null;
        device.scenarioUntil = null;

        device.nextScenarioAt = now + randomBetween(20 * 60_000, 40 * 60_000);

        return;
    }

    if (device.scenario !== 'NORMAL' || device.nextScenarioAt === null || now < device.nextScenarioAt) {
        return;
    }

    const scenarios: Scenario[] = ['WARNING', 'CRITICAL', 'OFFLINE'];

    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    if (scenario === 'WARNING') {
        startScenario(device, 'WARNING', randomBetween(2 * 60_000, 4 * 60_000));
    }

    if (scenario === 'CRITICAL') {
        startScenario(device, 'CRITICAL', randomBetween(2 * 60_000, 4 * 60_000));
    }

    if (scenario === 'OFFLINE') {
        startScenario(device, 'OFFLINE', randomBetween(5 * 60_000, 10 * 60_000));
    }
}

function createTelemetry(device: Device) {
    return {
        deviceCode: device.deviceCode,
        timestamp: new Date().toISOString(),
        temperature: getTemperature(device),
        sensorFailCount: 0,
        wifiFailCount: 0,
        httpFailCount: 0,
        rssi: -55 - Math.floor(Math.random() * 20),
        reason: null,
    };
}

async function sendTelemetry(device: Device) {
    if (device.scenario === 'OFFLINE') {
        return;
    }

    const payload = createTelemetry(device);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [DEVICE_KEY_HEADER]: DEVICE_API_KEY,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const body = await response.text();

            console.error(`[${new Date().toISOString()}]`, device.deviceCode, `HTTP ${response.status}`, body);

            return;
        }

        console.log(
            `[${new Date().toISOString()}]`,
            device.deviceCode,
            `temperature=${payload.temperature}°C`,
            `scenario=${device.scenario}`,
        );
    } catch (error) {
        console.error(`[${new Date().toISOString()}]`, device.deviceCode, 'FAILED', error);
    }
}

async function runDevice(device: Device) {
    if (device.initialOffsetMs > 0) {
        await sleep(device.initialOffsetMs);
    }

    while (true) {
        updateScenario(device);

        await sendTelemetry(device);

        await sleep(INTERVAL_MS + randomJitter());
    }
}

console.log('Starting fake telemetry...');
console.log(`API: ${API_URL}`);
console.log(`Devices: ${devices.length}`);
console.log(`Interval: ${INTERVAL_MS / 1000}s`);
console.log(`Jitter: ±${JITTER_MS / 1000}s`);
console.log();

for (const device of devices) {
    void runDevice(device);
}

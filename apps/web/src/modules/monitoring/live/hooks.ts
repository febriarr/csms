import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { DEVICE_UPDATE_EVENT, type DeviceMonitoring, type DeviceUpdateEvent, type DeviceView } from "@workspace/shared";
import type { DeviceQuery } from "@workspace/validator";

import { http } from "@/lib/http-client";
import { deviceQueryOptions } from "@/modules/settings/master-data/device/hooks";

import { getRecentReadings, SPARKLINE_MINUTES, type SeriesPoint } from "./recent.api";

/** Safety net next to the live stream: it also brings what events do not carry (pause details, new devices). */
const REFRESH_MS = 30_000;
const MAX_LIVE_POINTS = 360;

/* live stream (server-sent events) */

export type StreamStatus = "connecting" | "live" | "reconnecting" | "closed";

const STREAM_PATH = "/events/device-status";

/**
 * One EventSource for the whole page. The browser reconnects by itself; events sent while the stream was down
 * are gone, so `onReconnect` is called once it is back and the page reloads the list.
 */
export function useDeviceStream(onUpdate: (event: DeviceUpdateEvent) => void, onReconnect: () => void): StreamStatus {
    const [status, setStatus] = useState<StreamStatus>("connecting");

    // the handlers live in refs so the connection is opened once instead of on every render
    const updateRef = useRef(onUpdate);
    const reconnectRef = useRef(onReconnect);
    useEffect(() => {
        updateRef.current = onUpdate;
        reconnectRef.current = onReconnect;
    });

    useEffect(() => {
        // assumption: the HTTP client has a base URL, and the API accepts the session cookie on this origin
        const base = (http.defaults.baseURL ?? "").replace(/\/$/, "");
        const source = new EventSource(`${base}${STREAM_PATH}`, { withCredentials: true });
        let dropped = false;

        source.onopen = () => {
            setStatus("live");

            if (dropped) {
                dropped = false;
                reconnectRef.current();
            }
        };

        source.onerror = () => {
            dropped = true;
            // CLOSED = the browser gave up (for example the session expired); otherwise it keeps retrying
            setStatus(source.readyState === EventSource.CLOSED ? "closed" : "reconnecting");
        };

        source.addEventListener(DEVICE_UPDATE_EVENT, (message) => {
            try {
                updateRef.current(JSON.parse((message as MessageEvent<string>).data) as DeviceUpdateEvent);
            } catch {
                // a malformed event is skipped; the next one or the periodic refresh corrects the screen
            }
        });

        return () => source.close();
    }, []);

    return status;
}

/* sparkline history */

export function useRecentReadings(deviceIds: string[]) {
    const key = useMemo(() => [...deviceIds].sort().join(","), [deviceIds]);

    return useQuery({
        queryKey: ["temperature-recent", key, SPARKLINE_MINUTES],
        queryFn: ({ signal }) => getRecentReadings(deviceIds, SPARKLINE_MINUTES, signal),
        enabled: deviceIds.length > 0,
        staleTime: 60_000,
        // until the endpoint exists the sparklines are built from live events only, so a failure stays quiet
        retry: false,
        placeholderData: keepPreviousData,
    });
}

/* the list + the stream */

/** The event always carries the current values of the device, so it simply replaces what the list had. */
function applyEvent(device: DeviceView, event: DeviceUpdateEvent): DeviceView {
    // `paused` is true for both a running pause and the pull-down time after it
    const monitoring: DeviceMonitoring = event.paused
        ? device.monitoring.status === "ACTIVE"
            ? { status: "PAUSED", pause: null }
            : device.monitoring
        : { status: "ACTIVE", pause: null };

    return {
        ...device,
        state: event.state,
        isActive: event.isActive,
        lastTemperature: event.lastTemperature,
        lastSeenAt: event.lastSeenAt,
        stateChangedAt: event.stateChangedAt,
        monitoring,
    };
}

type Overrides = { stamp: number; byId: Record<string, DeviceUpdateEvent> };

export function useLiveDevices(query: DeviceQuery) {
    const list = useQuery({
        ...deviceQueryOptions(query),
        placeholderData: keepPreviousData,
        refetchInterval: REFRESH_MS,
    });

    // Events are kept next to the list, not written into it. A fresh list from the server is newer than any
    // event received before it, so the events are dropped whenever the list is reloaded.
    const [overrides, setOverrides] = useState<Overrides>({ stamp: list.dataUpdatedAt, byId: {} });
    if (overrides.stamp !== list.dataUpdatedAt) setOverrides({ stamp: list.dataUpdatedAt, byId: {} });

    const [livePoints, setLivePoints] = useState<Record<string, SeriesPoint[]>>({});

    const handleUpdate = useCallback((event: DeviceUpdateEvent) => {
        setOverrides((previous) => ({ ...previous, byId: { ...previous.byId, [event.id]: event } }));

        if (event.lastTemperature == null || !event.lastSeenAt) return;

        const t = new Date(event.lastSeenAt).getTime();
        const value = event.lastTemperature;

        setLivePoints((previous) => {
            const current = previous[event.id] ?? [];

            // a state change or an offline event repeats the last heartbeat: not a new point
            if (t <= (current.at(-1)?.t ?? 0)) return previous;

            return { ...previous, [event.id]: [...current, { t, v: value }].slice(-MAX_LIVE_POINTS) };
        });
    }, []);

    const { refetch } = list;
    const handleReconnect = useCallback(() => void refetch(), [refetch]);
    const streamStatus = useDeviceStream(handleUpdate, handleReconnect);

    const devices = useMemo(
        () =>
            (list.data ?? []).map((device) => {
                const event = overrides.byId[device.id];

                return event ? applyEvent(device, event) : device;
            }),
        [list.data, overrides]
    );

    const deviceIds = useMemo(() => (list.data ?? []).map((device) => device.id), [list.data]);
    const history = useRecentReadings(deviceIds);

    const series = useMemo(() => {
        const result: Record<string, SeriesPoint[]> = {};

        for (const id of deviceIds) {
            const base = history.data?.[id] ?? [];
            const lastBase = base.at(-1)?.t ?? 0;
            const live = (livePoints[id] ?? []).filter((point) => point.t > lastBase);

            result[id] = [...base, ...live];
        }

        return result;
    }, [deviceIds, history.data, livePoints]);

    return {
        devices,
        series,
        isPending: list.isPending,
        isError: list.isError,
        error: list.error,
        refetch,
        streamStatus,
    };
}

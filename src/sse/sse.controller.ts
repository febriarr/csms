import type { Request, Response } from 'express';
import { deviceEventBus } from '../sse/device-events';

export function streamDeviceStatus(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  deviceEventBus.register(res);

  const heartbeat = setInterval(() => res.write(':\n\n'), 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    deviceEventBus.remove(res);
  });
}

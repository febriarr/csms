import type { Response } from 'express';

class DeviceEventBus {
  private clients = new Set<Response>();

  register(res: Response) {
    this.clients.add(res);
  }

  remove(res: Response) {
    this.clients.delete(res);
  }

  broadcast(event: string, data: Record<string, unknown>) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of this.clients) {
      res.write(payload);
    }
  }

  get clientCount() {
    return this.clients.size;
  }
}

export const deviceEventBus = new DeviceEventBus();

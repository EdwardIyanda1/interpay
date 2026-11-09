export type RtEvent = { seq: number; topic: string; type: string; ts: string; data: any };

type Options = {
  url: string; // ws://host:port
  getTicket: () => Promise<string>; // asks the API for a short lived, single use connection ticket
  onEvent: (e: RtEvent) => void;
  onStatus?: (s: "connecting" | "open" | "closed") => void;
  onRefetch?: () => void; // the server could not replay everything: reload data over REST
};

/** One persistent WebSocket with reconnect (backoff + jitter), heartbeat and resume from the last seen seq. */
export class RealtimeClient {
  private ws?: WebSocket;
  private lastSeq = 0;
  private retry = 0;
  private timer: any;
  private ping: any;
  private stopped = true;

  constructor(private o: Options) {}

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    clearInterval(this.ping);
    this.ws?.close();
  }

  private async connect() {
    this.o.onStatus?.("connecting");
    let ticket: string;
    try {
      ticket = await this.o.getTicket();
    } catch {
      return this.schedule();
    }
    if (this.stopped) return;
    const ws = new WebSocket(`${this.o.url}/ws?ticket=${encodeURIComponent(ticket)}`);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.o.onStatus?.("open");
      ws.send(JSON.stringify({ type: "resume", last_seq: this.lastSeq }));
      this.ping = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ type: "ping" })), 25000);
    };
    ws.onmessage = (m) => {
      const e = JSON.parse(String(m.data));
      if (e.type === "refetch") return this.o.onRefetch?.();
      if (typeof e.seq === "number" && e.seq > this.lastSeq) {
        this.lastSeq = e.seq;
        this.o.onEvent(e as RtEvent);
      }
    };
    ws.onclose = () => {
      clearInterval(this.ping);
      this.o.onStatus?.("closed");
      if (!this.stopped) this.schedule();
    };
    ws.onerror = () => ws.close();
  }

  private schedule() {
    const delay = Math.min(30000, 1000 * 2 ** this.retry++) + Math.random() * 500;
    this.timer = setTimeout(() => !this.stopped && this.connect(), delay);
  }
}

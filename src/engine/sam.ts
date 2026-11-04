// Main-thread client for the SlimSAM worker. The worker (and the ~20 MB model behind it) is only
// created when AI selection is first turned on, so the rest of Chromalab never pays for it.

export interface SamPoint {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  label: 0 | 1; // 1 = part of the object, 0 = not part of it
}

export type SamDevice = 'webgpu' | 'wasm';

export type SamRequest =
  | { type: 'load'; cpu?: boolean }
  | { type: 'embed'; id: number; data: Uint8ClampedArray; width: number; height: number }
  | { type: 'decode'; id: number; points: SamPoint[] };

export type SamResponse =
  | { type: 'progress'; file: string; loaded: number; total: number }
  | { type: 'ready'; device: SamDevice }
  | { type: 'embedded'; id: number; device: SamDevice }
  | { type: 'decoded'; id: number; masks: Uint8Array; count: number; width: number; height: number; scores: number[] }
  | { type: 'error'; id?: number; message: string };

export interface SamMasks {
  masks: Uint8Array[]; // one 0/1 mask per candidate, width × height each
  scores: number[]; // model's own quality estimate per candidate
  width: number;
  height: number;
}

// Some GPU drivers hang under WebGPU without ever raising an error. The first GPU run also
// compiles shaders, so this is generous; past it the worker is replaced by a CPU-only one.
const GPU_EMBED_TIMEOUT_MS = 25000;

class TimeoutError extends Error {}

export class SamClient {
  private worker!: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: SamResponse) => void; reject: (err: Error) => void }>();
  private ready!: Promise<SamDevice>;
  private device: SamDevice | null = null;
  private onProgress: (fraction: number) => void;

  constructor(onProgress: (fraction: number) => void) {
    this.onProgress = onProgress;
    this.start(false);
  }

  private start(cpu: boolean) {
    this.worker = new Worker(new URL('./sam.worker.ts', import.meta.url), { type: 'module' });
    const files = new Map<string, { loaded: number; total: number }>();

    this.ready = new Promise((resolve, reject) => {
      this.worker.onmessage = (event: MessageEvent<SamResponse>) => {
        const message = event.data;
        if (message.type === 'progress') {
          files.set(message.file, { loaded: message.loaded, total: message.total });
          let loaded = 0;
          let total = 0;
          for (const f of files.values()) { loaded += f.loaded; total += f.total; }
          this.onProgress(total > 0 ? loaded / total : 0);
        } else if (message.type === 'ready') {
          this.device = message.device;
          resolve(message.device);
        } else if (message.type === 'error' && message.id === undefined) {
          reject(new Error(message.message));
        } else if ('id' in message && message.id !== undefined) {
          const entry = this.pending.get(message.id);
          if (!entry) return;
          this.pending.delete(message.id);
          if (message.type === 'error') entry.reject(new Error(message.message));
          else entry.resolve(message);
        }
      };
      this.worker.onerror = (event) => reject(new Error(event.message || 'Falha ao iniciar a IA'));
    });
    this.worker.postMessage({ type: 'load', cpu } satisfies SamRequest);
  }

  private stopWorker(reason: string) {
    this.worker.terminate();
    for (const entry of this.pending.values()) entry.reject(new Error(reason));
    this.pending.clear();
  }

  whenReady() {
    return this.ready;
  }

  private request(message: SamRequest & { id: number }, transfer: Transferable[] = []) {
    return new Promise<SamResponse>((resolve, reject) => {
      this.pending.set(message.id, { resolve, reject });
      this.worker.postMessage(message, transfer);
    });
  }

  private sendEmbed(rgba: Uint8ClampedArray, width: number, height: number) {
    const data = new Uint8ClampedArray(rgba);
    return this.request({ type: 'embed', id: this.nextId++, data, width, height }, [data.buffer]);
  }

  // Resolves with the device that actually ran the analysis
  async embed(rgba: Uint8ClampedArray, width: number, height: number): Promise<SamDevice> {
    await this.ready;
    if (this.device === 'webgpu') {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError('GPU timeout')), GPU_EMBED_TIMEOUT_MS);
      });
      try {
        const response = await Promise.race([this.sendEmbed(rgba, width, height), timeout]);
        return response.type === 'embedded' ? response.device : 'wasm';
      } catch (err) {
        if (!(err instanceof TimeoutError)) throw err;
        console.warn('SlimSAM: WebGPU analysis timed out, restarting on CPU');
        this.stopWorker('Reiniciando a IA na CPU');
        this.start(true);
        await this.ready;
      } finally {
        clearTimeout(timer);
      }
    }
    const response = await this.sendEmbed(rgba, width, height);
    return response.type === 'embedded' ? response.device : 'wasm';
  }

  async decode(points: SamPoint[]): Promise<SamMasks> {
    await this.ready;
    const response = await this.request({ type: 'decode', id: this.nextId++, points });
    if (response.type !== 'decoded') throw new Error('Resposta inesperada da IA');
    const size = response.width * response.height;
    const masks = Array.from({ length: response.count }, (_, k) => response.masks.subarray(k * size, (k + 1) * size));
    return { masks, scores: response.scores, width: response.width, height: response.height };
  }

  dispose() {
    this.stopWorker('IA encerrada');
  }
}

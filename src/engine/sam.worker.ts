// SlimSAM (Segment Anything, compressed) running in a worker so the UI never blocks.
// The image is encoded once; every click only runs the small prompt decoder.

import { SamModel, AutoProcessor, RawImage, Tensor, env } from '@huggingface/transformers';
import type { SamDevice, SamRequest, SamResponse } from './sam';

const MODEL_ID = 'Xenova/slimsam-77-uniform';

env.allowLocalModels = false;

// The SAM processor's call signature and post-processing are not in the generic Processor type
interface SamImageInputs {
  original_sizes: [number, number][];
  reshaped_input_sizes: [number, number][];
  [key: string]: unknown;
}
interface SamProcessorLike {
  (image: RawImage): Promise<SamImageInputs>;
  post_process_masks(masks: Tensor, original: [number, number][], reshaped: [number, number][]): Promise<Tensor[]>;
}

let model: SamModel | null = null;
let processor: SamProcessorLike | null = null;
let imageInputs: SamImageInputs | null = null;
let embeddings: Record<string, Tensor> | null = null;
let device: SamDevice = 'wasm';

const post = (message: SamResponse, transfer: Transferable[] = []) =>
  (self as unknown as Worker).postMessage(message, transfer);

// WebGPU when available (half precision if the GPU supports it), otherwise the quantized CPU build
async function pickBackend(): Promise<{ device: SamDevice; dtype: 'fp16' | 'fp32' | 'q8' }> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> } }).gpu;
  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter();
      if (adapter) return { device: 'webgpu', dtype: adapter.features.has('shader-f16') ? 'fp16' : 'fp32' };
    } catch {
      // fall through to CPU
    }
  }
  return { device: 'wasm', dtype: 'q8' };
}

const CPU_BACKEND = { device: 'wasm', dtype: 'q8' } as const;

async function load(backend?: { device: SamDevice; dtype: 'fp16' | 'fp32' | 'q8' }) {
  const chosen = backend ?? (await pickBackend());
  const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status === 'progress' && p.file && p.total) {
      post({ type: 'progress', file: p.file, loaded: p.loaded ?? 0, total: p.total });
    }
  };
  model = (await SamModel.from_pretrained(MODEL_ID, { ...chosen, progress_callback })) as SamModel;
  processor = (await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback })) as unknown as SamProcessorLike;
  device = chosen.device;
}

// Some GPU drivers hang or lose the device under WebGPU; the CPU build is slower but works anywhere
async function switchToCpu(err: unknown) {
  console.warn('SlimSAM: WebGPU failed, switching to CPU', err);
  await model?.dispose().catch(() => {});
  await load(CPU_BACKEND);
}

async function withCpuFallback<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (device !== 'webgpu') throw err;
    await switchToCpu(err);
    return run();
  }
}

let lastImage: { data: Uint8ClampedArray; width: number; height: number } | null = null;

async function embed(data: Uint8ClampedArray, width: number, height: number) {
  if (!model || !processor) throw new Error('Modelo não carregado');
  lastImage = { data, width, height };
  const image = new RawImage(data, width, height, 4).rgb();
  imageInputs = await processor(image);
  embeddings = await model.get_image_embeddings(imageInputs as unknown as { pixel_values: Tensor });
}

async function decode(points: { x: number; y: number; label: 0 | 1 }[]) {
  if (!model || !processor || !imageInputs || !embeddings) throw new Error('Imagem não analisada');
  const [rh, rw] = imageInputs.reshaped_input_sizes[0];
  const coords = points.flatMap((p) => [p.x * rw, p.y * rh]);
  const input_points = new Tensor('float32', Float32Array.from(coords), [1, 1, points.length, 2]);
  const input_labels = new Tensor('int64', BigInt64Array.from(points.map((p) => BigInt(p.label))), [1, 1, points.length]);
  const outputs = await model({ ...embeddings, input_points, input_labels });
  const [masks] = await processor.post_process_masks(
    outputs.pred_masks,
    imageInputs.original_sizes,
    imageInputs.reshaped_input_sizes,
  );
  const [, count, height, width] = masks.dims as number[];
  const data = new Uint8Array(masks.data as Uint8Array);
  return { masks: data, count, width, height, scores: Array.from(outputs.iou_scores.data as Float32Array) };
}

self.onmessage = async (event: MessageEvent<SamRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'load') {
      await load(request.cpu ? CPU_BACKEND : undefined);
      post({ type: 'ready', device });
    } else if (request.type === 'embed') {
      await withCpuFallback(() => embed(request.data, request.width, request.height));
      post({ type: 'embedded', id: request.id, device });
    } else if (request.type === 'decode') {
      // Decoding needs the embeddings, so a GPU failure here re-runs the image analysis on CPU
      const result = await decode(request.points).catch(async (err) => {
        if (device !== 'webgpu' || !lastImage) throw err;
        const image = lastImage;
        await switchToCpu(err);
        await embed(image.data, image.width, image.height);
        return decode(request.points);
      });
      post({ type: 'decoded', id: request.id, ...result }, [result.masks.buffer]);
    }
  } catch (err) {
    post({ type: 'error', id: 'id' in request ? request.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};

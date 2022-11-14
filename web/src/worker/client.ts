import { WorkerMessageType } from './events';
import { postMessage } from './utils';
import { VideoReader } from '../core/video-reader';
import { calculateDisplaySize } from '../utils/canvas';
import { transferToArrayBuffer } from '../utils/common';

import type { WorkerMessage } from './worker';
import type { ModuleOption } from '../pag';
import type { TimeRange } from '../interfaces';
import type { PAGViewOptions } from '../pag-view';

export const MAX_ACTIVE_WORKER_CONTEXTS = 4;

const videoReaders: VideoReader[] = [];

export class WorkerPAGFile {
  public static async load(worker: Worker, data: File | Blob | ArrayBuffer) {
    const buffer = await transferToArrayBuffer(data);
    if (!buffer)
      throw new Error(
        'Initialize PAGFile data type error, please put check data type must to be File ｜ Blob | ArrayBuffer!',
      );
    return await postMessage(
      worker,
      { name: WorkerMessageType.PAGFile_load, args: [data] },
      (key) => new WorkerPAGFile(worker, key),
    );
  }

  public key: number;
  public worker: Worker;

  public constructor(worker: Worker, key: number) {
    this.worker = worker;
    this.key = key;
  }
}

export class WorkerPAGView {
  public static init(file: WorkerPAGFile, canvas: HTMLCanvasElement, initOptions?: PAGViewOptions) {
    const options = {
      ...{
        useScale: true,
        useCanvas2D: false,
        firstFrame: true,
      },
      ...initOptions,
    };
    if (options.useScale) {
      resizeCanvas(canvas);
    }
    const offscreen = canvas.transferControlToOffscreen();
    return postMessage(
      file.worker,
      { name: WorkerMessageType.PAGView_init, args: [file.key, offscreen, initOptions] },
      (key: number) => new WorkerPAGView(file.worker, key),
      [offscreen],
    );
  }

  public key: number;
  public worker: Worker;

  public constructor(worker: Worker, key: number) {
    this.worker = worker;
    this.key = key;
  }
  public play() {
    return postMessage(this.worker, { name: WorkerMessageType.PAGView_play, args: [this.key] }, () => undefined);
  }
  public setRepeatCount(repeatCount: number) {
    return postMessage(
      this.worker,
      { name: WorkerMessageType.PAGView_setRepeatCount, args: [this.key, repeatCount] },
      () => undefined,
    );
  }
  public setProgress(progress: number) {
    return postMessage(
      this.worker,
      {
        name: WorkerMessageType.PAGView_setProgress,
        args: [this.key, progress],
      },
      () => undefined,
    );
  }
  public flush() {
    return postMessage(this.worker, { name: WorkerMessageType.PAGView_flush, args: [this.key] }, (res: boolean) => res);
  }
}

export const createPAGWorker = (
  moduleOption: ModuleOption & { workerScriptURL?: string | URL; workerOptions?: WorkerOptions } = {},
) => {
  const scriptURL = moduleOption.workerScriptURL || 'libpag.js';
  const worker = new Worker(scriptURL, moduleOption.workerOptions);
  const option: { fileUrl?: string } = {};
  if (moduleOption.locateFile) {
    option.fileUrl = moduleOption.locateFile('libpag.wasm');
  }
  return postMessage(worker, { name: WorkerMessageType.PAGInit, args: [option] }, () => {
    addGlobalWorkerListener(worker);
    return worker;
  });
};

const addGlobalWorkerListener = (worker: Worker) => {
  const handle = (event: MessageEvent<WorkerMessage>) => {
    if (event.data.name === WorkerMessageType.VideoReader_constructor) {
      const videoReader = new VideoReader(...(event.data.args as [Uint8Array, number, number, number, TimeRange[]]));
      videoReaders.push(videoReader);
      worker.postMessage({ name: WorkerMessageType.VideoReader_constructor, args: [videoReaders.length - 1] });
      return;
    }
    if (event.data.name === 'VideoReader.prepare') {
      const [proxyId, targetFrame] = event.data.args as [number, number];
      videoReaders[proxyId].prepare(targetFrame).then((res) => {
        videoReaders[proxyId].generateBitmap().then((bitmap) => {
          worker.postMessage({ name: 'VideoReader.prepare', args: [res, bitmap] });
        });
      });
    }
    if (event.data.name === 'VideoReader.renderToTexture') {
      videoReaders[event.data.args[0]].generateBitmap().then((res) => {
        worker.postMessage({ name: 'VideoReader.renderToTexture', args: [res] }, [res]);
      });
    }
  };
  worker.addEventListener('message', handle);
};

const resizeCanvas = (canvas: HTMLCanvasElement) => {
  const displaySize = calculateDisplaySize(canvas);
  canvas.style.width = `${displaySize.width}px`;
  canvas.style.height = `${displaySize.height}px`;
  canvas.width = displaySize.width * globalThis.devicePixelRatio;
  canvas.height = displaySize.height * globalThis.devicePixelRatio;
};

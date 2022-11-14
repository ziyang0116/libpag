import { VIDEO_DECODE_WAIT_FRAME, VIDEO_PLAYBACK_RATE_MAX, VIDEO_PLAYBACK_RATE_MIN } from '../constant';
import { addListener, removeListener, removeAllListeners } from '../utils/video-listener';
import { IPHONE, IS_WECHAT, IS_WORKER } from '../utils/ua';

import type { EmscriptenGL } from '../types';
import type { TimeRange } from '../interfaces';
import type { WorkerMessage } from '../worker/worker';

const UHD_RESOLUTION = 3840;

// Get video initiated token on Wechat browser.
const getWechatNetwork = () => {
  return new Promise<void>((resolve) => {
    window.WeixinJSBridge.invoke(
      'getNetworkType',
      {},
      () => {
        resolve();
      },
      () => {
        resolve();
      },
    );
  });
};

const playVideoElement = async (videoElement: HTMLVideoElement) => {
  if (IS_WECHAT && window.WeixinJSBridge) {
    await getWechatNetwork();
  }
  try {
    await videoElement.play();
  } catch (error: any) {
    console.error(error.message);
    throw new Error(
      'Failed to decode video, please play PAG after user gesture. Or your can load a software decoder to decode the video.',
    );
  }
};

const requestVideoFrameCallback = (videoElement: HTMLVideoElement, frameRate: number, callback: () => void) => {
  if (videoElement.requestVideoFrameCallback) {
    videoElement.requestVideoFrameCallback(callback);
  } else {
    setTimeout(callback, 1000 / frameRate);
  }
};

interface VideoReaderTarget {
  bitmap: ImageBitmap | null;
  prepare: (targetFrame: number) => Promise<boolean>;
  renderToTexture: (GL: EmscriptenGL, textureID: number) => void;
  onDestroy: () => void;
}

export class VideoReader {
  public static isIOS() {
    return IPHONE;
  }

  public static isAndroidMiniprogram() {
    return false;
  }

  public static async create(
    mp4Data: Uint8Array,
    width: number,
    height: number,
    frameRate: number,
    staticTimeRanges: TimeRange[],
  ): Promise<VideoReaderTarget> {
    if (IS_WORKER) {
      const proxyId = await new Promise<number>((resolve) => {
        const buffer = mp4Data.buffer.slice(mp4Data.byteOffset, mp4Data.byteOffset + mp4Data.byteLength);
        const handle = (event: MessageEvent<WorkerMessage>) => {
          if (event.data.name === 'VideoReader.constructor') {
            removeEventListener('message', handle);
            resolve(event.data.args[0]);
          }
        };
        addEventListener('message', handle);
        (self as DedicatedWorkerGlobalScope).postMessage(
          { name: 'VideoReader.constructor', args: [buffer, width, height, frameRate, staticTimeRanges] },
          [buffer],
        );
      });
      const videoReader = {
        bitmap: null,
        prepare: (targetFrame: number) => {
          return new Promise<boolean>((resolve) => {
            const handle = (event: MessageEvent<WorkerMessage>) => {
              if (event.data.name === 'VideoReader.prepare') {
                removeEventListener('message', handle);
                videoReader.bitmap = event.data.args[1];
                resolve(event.data.args[0]);
              }
            };
            addEventListener('message', handle);
            self.postMessage({ name: 'VideoReader.prepare', args: [proxyId, targetFrame] });
          });
        },
        renderToTexture: (GL: EmscriptenGL, textureID: number) => {
          if (!videoReader.bitmap) return;
          const gl = GL.currentContext?.GLctx as WebGLRenderingContext;
          gl.bindTexture(gl.TEXTURE_2D, GL.textures[textureID]);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoReader.bitmap);
        },
        onDestroy: () => {
          self.postMessage({ name: 'VideoReader.onDestroy', args: [proxyId] });
        },
      };
      return videoReader;
    }
    return new VideoReader(mp4Data, width, height, frameRate, staticTimeRanges);
  }

  public bitmap: ImageBitmap | null = null;

  private videoEl: HTMLVideoElement | null = null;
  private width = 0;
  private height = 0;
  private readonly frameRate: number = 0;
  private lastVideoTime = -1;
  private hadPlay = false;
  private staticTimeRanges: StaticTimeRanges | null = null;
  private lastPrepareTime: { frame: number; time: number }[] = [];
  private disablePlaybackRate = false;
  private bitmapCanvas: OffscreenCanvas | null = null;
  private bitmapCtx: OffscreenCanvasRenderingContext2D | null = null;

  public constructor(
    mp4Data: Uint8Array,
    width: number,
    height: number,
    frameRate: number,
    staticTimeRanges: TimeRange[],
  ) {
    this.videoEl = document.createElement('video');
    this.videoEl.style.display = 'none';
    this.videoEl.muted = true;
    this.videoEl.playsInline = true;
    addListener(this.videoEl, 'timeupdate', this.onTimeupdate.bind(this));
    this.frameRate = frameRate;
    const blob = new Blob([mp4Data], { type: 'video/mp4' });
    this.videoEl.src = URL.createObjectURL(blob);
    this.staticTimeRanges = new StaticTimeRanges(staticTimeRanges);
    this.width = width;
    this.height = height;
    if (UHD_RESOLUTION < width || UHD_RESOLUTION < height) {
      this.disablePlaybackRate = true;
    }
  }

  public async prepare(targetFrame: number) {
    if (!this.videoEl) {
      console.error('Video element is null!');
      return false;
    }
    this.alignPlaybackRate(targetFrame);
    const { currentTime } = this.videoEl;
    const targetTime = targetFrame / this.frameRate;
    this.lastVideoTime = targetTime;
    if (currentTime === 0 && targetTime === 0) {
      if (this.hadPlay) {
        return true;
      } else {
        // Wait for initialization to complete
        await this.nextFrame();
        this.hadPlay = true;
        return true;
      }
    } else {
      if (Math.round(targetTime * this.frameRate) === Math.round(currentTime * this.frameRate)) {
        // Current frame
        return true;
      } else if (this.staticTimeRanges?.contains(targetFrame)) {
        // Static frame
        return await this.seek(targetTime, false);
      } else if (Math.abs(currentTime - targetTime) < (1 / this.frameRate) * VIDEO_DECODE_WAIT_FRAME) {
        // Within tolerable frame rate deviation
        if (this.videoEl.paused) {
          await playVideoElement(this.videoEl);
        }
        return true;
      } else {
        // Seek and play
        return await this.seek(targetTime);
      }
    }
  }

  public renderToTexture(GL: EmscriptenGL, textureID: number) {
    if (!this.videoEl || this.videoEl.readyState < 2) return;
    const gl = GL.currentContext?.GLctx as WebGLRenderingContext;
    gl.bindTexture(gl.TEXTURE_2D, GL.textures[textureID]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoEl);
  }

  // Only work in web worker version
  public async generateBitmap() {
    // Batter than createImageBitmap from video element in benchmark
    if (!this.bitmapCanvas) {
      this.bitmapCanvas = new OffscreenCanvas(this.width, this.height);
      this.bitmapCanvas!.width = this.width;
      this.bitmapCanvas!.height = this.height;
      this.bitmapCtx = this.bitmapCanvas.getContext('2d');
    }
    this.bitmapCtx?.fillRect(0, 0, this.width, this.height);
    this.bitmapCtx?.drawImage(this.videoEl as HTMLVideoElement, 0, 0, this.width, this.height);
    this.bitmap = await createImageBitmap(this.bitmapCanvas);
    return this.bitmap;
  }

  public onDestroy() {
    if (!this.videoEl) {
      throw new Error('Video element is null!');
    }
    removeAllListeners(this.videoEl, 'playing');
    removeAllListeners(this.videoEl, 'timeupdate');
    this.videoEl = null;
    this.bitmapCanvas = null;
    this.bitmapCtx = null;
  }

  private onTimeupdate() {
    if (!this.videoEl || this.lastVideoTime < 0) return;
    const { currentTime } = this.videoEl;
    if (currentTime - this.lastVideoTime >= (1 / this.frameRate) * VIDEO_DECODE_WAIT_FRAME && !this.videoEl.paused) {
      this.videoEl.pause();
      this.videoEl.currentTime = this.lastVideoTime;
    }
  }

  private seek(targetTime: number, play = true) {
    return new Promise<boolean>((resolve) => {
      let isCallback = false;
      let timer: any = null;
      const canplayCallback = async () => {
        if (!this.videoEl) {
          console.error('Video element is null!');
          resolve(false);
          return;
        }
        removeListener(this.videoEl, 'seeked', canplayCallback);
        if (play && this.videoEl.paused) {
          await playVideoElement(this.videoEl);
        } else if (!play && !this.videoEl.paused) {
          this.videoEl.pause();
        }
        isCallback = true;
        clearTimeout(timer);
        timer = null;
        resolve(true);
      };
      if (!this.videoEl) {
        console.error('Video element is null!');
        resolve(false);
        return;
      }
      addListener(this.videoEl, 'seeked', canplayCallback);
      this.videoEl!.currentTime = targetTime;
      // Timeout
      timer = setTimeout(() => {
        if (!isCallback) {
          if (!this.videoEl) {
            console.error('Video element is null!');
            resolve(false);
            return;
          } else {
            removeListener(this.videoEl, 'seeked', canplayCallback);
            if (play && this.videoEl.paused) {
              playVideoElement(this.videoEl);
            } else if (!play && !this.videoEl.paused) {
              this.videoEl.pause();
            }
            resolve(false);
          }
        }
      }, (1000 / this.frameRate) * VIDEO_DECODE_WAIT_FRAME);
    });
  }

  private alignPlaybackRate(targetFrame: number) {
    if (!this.videoEl || this.disablePlaybackRate) return;
    const now = performance.now();
    if (this.lastPrepareTime.length === 0) {
      this.lastPrepareTime.push({ frame: targetFrame, time: now });
      return;
    }
    if (this.lastPrepareTime[this.lastPrepareTime.length - 1].frame === targetFrame) return;
    if (targetFrame < this.lastPrepareTime[this.lastPrepareTime.length - 1].frame) {
      this.lastPrepareTime = [];
      this.lastPrepareTime.push({ frame: targetFrame, time: now });
      return;
    }
    if (this.lastPrepareTime.length === 5) {
      this.lastPrepareTime.shift();
    }
    this.lastPrepareTime.push({ frame: targetFrame, time: now });
    const distance = (now - this.lastPrepareTime[0].time) / (targetFrame - this.lastPrepareTime[0].frame);
    let playbackRate = 1000 / this.frameRate / distance;
    playbackRate = Math.min(Math.max(playbackRate, VIDEO_PLAYBACK_RATE_MIN), VIDEO_PLAYBACK_RATE_MAX);
    this.videoEl!.playbackRate = playbackRate;
  }

  private nextFrame() {
    return new Promise<boolean>((resolve) => {
      if (!this.videoEl) {
        resolve(false);
        return;
      }
      playVideoElement(this.videoEl).then(() => {
        requestVideoFrameCallback(this.videoEl as HTMLVideoElement, this.frameRate, () => {
          this.videoEl?.pause();
          resolve(true);
        });
      });
    });
  }
}

export class StaticTimeRanges {
  private timeRanges: TimeRange[];

  public constructor(timeRanges: TimeRange[]) {
    this.timeRanges = timeRanges;
  }

  public contains(targetFrame: number) {
    if (this.timeRanges.length === 0) return false;
    for (let timeRange of this.timeRanges) {
      if (timeRange.start <= targetFrame && targetFrame < timeRange.end) {
        return true;
      }
    }
    return false;
  }
}

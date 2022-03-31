import { convertMp4 } from '../h264/h264';
import { EmscriptenGL } from '../types';

declare const wx: any;
export class VideoReader {
  private readonly frameRate: number;
  private currentFrame: number;
  private fileTarget: string;
  private videoDecoderReady = false;
  private videoDecoder: any;
  private framebuffer: any;

  public constructor(
    width: number,
    height: number,
    frameRate: number,
    h264Headers: Uint8Array[],
    h264Frames: Uint8Array[],
    ptsList: number[],
  ) {
    this.frameRate = frameRate;
    this.currentFrame = -1;
    const mp4 = convertMp4(h264Frames, h264Headers, width, height, this.frameRate, ptsList);
    const fs = wx.getFileSystemManager();
    const pagPath = `${wx.env.USER_DATA_PATH}/pag/`;
    this.fileTarget = `${pagPath}${new Date().getTime()}.mp4`;
    try {
      fs.accessSync(pagPath);
    } catch (e) {
      try {
        fs.mkdirSync(pagPath);
      } catch (err) {
        console.error(e);
      }
    }
    fs.writeFileSync(this.fileTarget, mp4.buffer, 'utf8');
    this.videoDecoder = wx.createVideoDecoder();
    this.videoDecoderStart(this.fileTarget);
    this.framebuffer = null;
  }

  public async prepare(targetFrame: number) {
    if (targetFrame === this.currentFrame) {
      return true;
    } else {
      if (!this.videoDecoderReady) {
        await this.waitVideoDecoderStarted();
      } else {
        await this.videoDecoderSeek(Math.floor((targetFrame / this.frameRate) * 1000));
      }
      this.currentFrame = targetFrame;
      this.framebuffer = await this.getFrameData();
      return true;
    }
  }

  public renderToTexture(GL: EmscriptenGL, textureID: number) {
    const gl = GL.currentContext.GLctx;
    gl.bindTexture(gl.TEXTURE_2D, GL.textures[textureID]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.framebuffer.width,
      this.framebuffer.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(this.framebuffer.data),
    );
  }

  public onDestroy() {
    this.currentFrame = -1;
  }

  private videoDecoderStart(path: string) {
    return new Promise((resolve) => {
      const onStarted = () => {
        this.videoDecoderReady = true;
        this.videoDecoder.off('start', onStarted);
        resolve(true);
      };
      this.videoDecoder.on('start', onStarted);
      this.videoDecoder.start({ source: path, mode: 0 });
    });
  }

  private waitVideoDecoderStarted() {
    return new Promise((resolve) => {
      const onStarted = () => {
        this.videoDecoder.off('start', onStarted);
        resolve(true);
      };
      this.videoDecoder.on('start', onStarted);
    });
  }

  private videoDecoderSeek(position: number) {
    return new Promise((resolve) => {
      const onSeeked = () => {
        this.videoDecoder.off('seek', onSeeked);
        resolve(true);
      };
      this.videoDecoder.on('seek', onSeeked);
      this.videoDecoder.seek(position);
    });
  }

  private getFrameData() {
    return new Promise((resolve) => {
      const loop = () => {
        const frameData = this.videoDecoder.getFrameData();
        if (frameData !== null) {
          resolve(frameData);
          return;
        }
        setTimeout(() => {
          loop();
        }, 1);
      };
      loop();
    });
  }
}

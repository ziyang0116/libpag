import { PAGInit } from '../src/pag';
import type { PAGImageLayer } from '../src/pag-image-layer';

window.onload = async () => {
  const { PAGFile, PAGView, PAGImage } = await PAGInit({ locateFile: (file: string) => '../lib/' + file });
  const buffer = await fetch('https://obs-ppt.liaoxingqiu.com/ds/def.pag').then((res) => res.arrayBuffer());
  const pagFile = await PAGFile.load(buffer);
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1080;
  document.body.appendChild(canvas);

  const pagLayer = pagFile.getLayersByName('hair_b').get(0) as PAGImageLayer;
  pagLayer.replaceImage(
    PAGImage.fromSource(await getImage('https://obs-ppt.liaoxingqiu.com/images/dress/1668134142619992.png')),
  );
  const pagView = await PAGView.init(pagFile, canvas);
  pagView?.setRepeatCount(0);
  pagView?.play();
};

const getImage = (url: string) => {
  return (() => {
    return new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.crossOrigin = 'anonymous';
      image.src = url;
    });
  })();
};

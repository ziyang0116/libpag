import * as types from '../types';

import type { ModuleOption, PAGInit } from '../pag';
import type { PAGFile } from '../pag-file';
import { PAGView } from '../pag-view';

declare global {
  interface Window {
    PAG: types.PAG;
  }
}

export interface WorkerMessage {
  name: string;
  args: any[];
}
const pagFiles: (PAGFile & { [prop: string]: any })[] = [];

const registerPAGFile = (pagFile: PAGFile) => {
  pagFiles.push(pagFile);
  return pagFiles.length - 1;
};

const pagViews: (PAGView & { [prop: string]: any })[] = [];
const registerPAGView = (pagView: PAGView) => {
  pagViews.push(pagView);
  return pagViews.length - 1;
};

const workerInit = (init: typeof PAGInit) => {
  onmessage = async (event: MessageEvent<WorkerMessage>) => {
    if (event.data.name.includes('PAGInit')) {
      const option: ModuleOption = {};
      if (event.data.args[0]) {
        option.locateFile = () => event.data.args[0].fileUrl;
      }
      init(option).then((module: types.PAG) => {
        self.PAG = module;
        postMessage({ name: event.data.name, args: [] });
      });
      return;
    }
    if (event.data.name.includes('PAGFile.load')) {
      const key = registerPAGFile(await self.PAG.PAGFile.load(event.data.args[0]));
      postMessage({ name: event.data.name, args: [key] });
      return;
    }
    if (event.data.name.includes('PAGView.init')) {
      const key = registerPAGView(
        (await self.PAG.PAGView.init(pagFiles[event.data.args[0]], event.data.args[1], event.data.args[2])) as PAGView,
      );
      postMessage({ name: event.data.name, args: [key] });
      return;
    }

    const name = event.data.name.split('_')[0];
    const [type, fnName] = name.split('.') as [string, string];
    const key = event.data.args[0];
    if (type === 'PAGFile') {
      const pagFile = pagFiles[key];
      if (!pagFile) throw new Error("pagFile doesn't exist");
      const fn = pagFile[fnName] as Function;
      if (!fn) throw new Error(`PAGFile.${fnName} doesn't exist`);
      const res = await fn.call(pagFile, ...event.data.args.slice(1));
      postMessage({ name: event.data.name, args: [res] });
    }
    if (type === 'PAGView') {
      const pagView = pagViews[key];
      if (!pagView) throw new Error("pagView doesn't exist");
      const fn = pagView[fnName] as Function;
      if (!fn) throw new Error(`PAGView.${fnName} doesn't exist`);
      const res = await fn.call(pagView, ...event.data.args.slice(1));
      postMessage({ name: event.data.name, args: [res] });
    }
  };
};

export { workerInit };

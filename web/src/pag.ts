import { binding } from './binding';
import * as types from './types';
import createPAG from './wasm/libpag';
import { WebAssemblyQueue } from './utils/queue';
import { workerInit } from './worker/worker';
import { IS_WORKER } from './utils/ua';

export interface ModuleOption {
  /**
   * Link to wasm file.
   */
  locateFile?: (file: string) => string;
}

/**
 * Initialize pag webassembly module.
 */
const PAGInit = (moduleOption: ModuleOption = {}): Promise<types.PAG> =>
  createPAG(moduleOption)
    .then((module: types.PAG) => {
      binding(module);
      module.webAssemblyQueue = new WebAssemblyQueue();
      module.globalCanvas = new module.GlobalCanvas();
      module.PAGFont.registerFallbackFontNames();
      return module;
    })
    .catch((error: any) => {
      console.error(error);
      throw new Error('PAGInit fail! Please check .wasm file path valid.');
    });

if (IS_WORKER) {
  workerInit(PAGInit);
}

export { PAGInit, types };

if (!globalThis) {
  globalThis = (() => {
    if (typeof self !== 'undefined') {
      return self;
    }
    if (typeof window !== 'undefined') {
      return window;
    }
    if (typeof global !== 'undefined') {
      return global;
    }
    throw new Error('unable to locate global object');
  })();
}

const nav = navigator.userAgent;
export const ANDROID = /android|adr/i.test(nav);
export const MOBILE = /(mobile)/i.test(nav) && ANDROID;
export const MACOS = !(/(mobile)/i.test(nav) || MOBILE) && /Mac OS X/i.test(nav);
export const IPHONE = /(iphone|ipad|ipod)/i.test(nav);
export const IS_WECHAT = /MicroMessenger/i.test(nav);
export const IS_WORKER = typeof globalThis.importScripts === 'function';

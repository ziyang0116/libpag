export enum WorkerMessageType {
  PAGInit = 'PAGInit',
  // PAGView static methods
  PAGView_init = 'PAGView.init',
  // PAGView instance methods
  PAGView_play = 'PAGView.play',
  PAGView_setRepeatCount = 'PAGView.setRepeatCount',
  PAGView_setProgress = 'PAGView.setProgress',
  PAGView_flush = 'PAGView.flush',
  // PAGFile static methods
  PAGFile_load = 'PAGFile.load',
  // VideoFile static methods
  VideoReader_constructor = 'VideoReader.constructor',
}

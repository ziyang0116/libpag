// index.js
// 获取应用实例
const app = getApp();

Page({
  data: {
    canvasW: 0,
    canvasH: 0,
    pagUrl: '',
    pagShow: false,
  },
  onLoad() {},
  onReady() {
    console.log('globalData:', app.globalData);
    this.createPag();
  },
  loadPagFile() {
    wx.request({
      url: this.data.pagUrl,
      responseType: 'arraybuffer',
      success: (res) => {
        this.init(res.data);
      },
      fail(err) {
        console.log('loadPage error:', err);
      },
    });
  },
  createPag() {
    app.globalData.libpag
      .PAGInit({
        locateFile: (file) => '/utils/' + file,
      })
      .then((PAG) => {
        this.PAG = PAG;
        this.loadPagFile();
      });
  },
  init(arraybuffer) {
    const pagFile = this.PAG.PAGFile.loadFromBuffer(arraybuffer);
    const pagWidth = pagFile.width();
    const pagHeight = pagFile.height();
    this.setData({
      canvasW: pagWidth,
      canvasH: pagHeight,
      pagShow: true,
    });
    console.log('pag width:', pagWidth, pagHeight);

    const queryT = wx.createSelectorQuery();
    queryT
      .select('#pag')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        const canvas = res[0].node;
        canvas.width = pagWidth;
        canvas.height = pagHeight;
        const pagView = await this.PAG.PAGView.init(pagFile, canvas);
        pagView.setRepeatCount(0);
        await pagView.play();
      });
  },
});

// app.js
App({
  onLaunch() {
    this.globalData.libpag = require('./utils/libpag.wx.js');
  },
  globalData: {
    libpag: null,
  },
});

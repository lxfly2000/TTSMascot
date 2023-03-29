module.exports = {
  //设置参考：https://electron.github.io/electron-packager/main/interfaces/electronpackager.options.html
  packagerConfig: {
    asar:true,
    ignore:[
      /ずんだもん立ち絵素材改1\.0/,
      /栗田まろん立ち素材/,
      /きりたん立ち素材/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};

# TTS Mascot
TTS桌宠

## 功能
角色显示，集中提供语音合成接口。

## 使用
`curl http://localhost:20042/action -X POST -d <JSON数据>`

可通过`curl http://localhost:20042/`获得详细的说明。
## 构建，运行
* 若使用中国网络，建议先指定镜像：`set electron_mirror=https://npmmirror.com/mirrors/electron/`
* 安装依赖：`npm install`
* 运行：`npm start`

依赖项：
```
electron@22
psd
```
* 因该应用需要支持在Win7上运行，Electron请勿使用超过22的版本
* Node.js的版本号：https://nodejs.org/en/download/releases
* Electron的版本号：https://www.npmjs.com/package/electron-releases
* PSDTool：https://oov.github.io/psdtool/
* https://github.com/SlashNephy/SimpleVoiceroid2Proxy

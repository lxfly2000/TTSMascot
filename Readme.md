# TTS Mascot
TTS桌宠

## 功能
角色显示，集中提供语音合成接口。

## 使用
`curl http://localhost:20042/action -X POST -d <JSON数据>`

可通过`curl http://localhost:20042/`获得详细的说明。

若要添加角色，请参考三个示例角色（[ずんだもん立ち絵素材改1.0](ずんだもん立ち絵素材改1.0) [栗田まろん立ち素材](栗田まろん立ち素材) [きりたん立ち素材](きりたん立ち素材)）中的文件修改JS脚本和mascots.json文件。（[查看mascots.json文件示例](examples.md)）
## 构建，运行
* 若使用中国网络，建议先指定镜像：`set electron_mirror=https://npmmirror.com/mirrors/electron/`
* 安装依赖：`npm install`
* 运行：`npm start`
* 打包：`npm make`

依赖项：
```
electron@22
psd
```
* Node.js: https://nodejs.org/en/download/releases
* Electron: https://releases.electronjs.org/ (该应用暂时不打算放弃Win7系统，因此Electron请勿使用超过22的版本) [版本号](https://releases.electronjs.org/releases.json)
* PSDTool: https://oov.github.io/psdtool/ (用于生成PSD的图层配置)
* SimpleVoiceroid2Proxy: https://github.com/SlashNephy/SimpleVoiceroid2Proxy (提供VOICEROID2 HTTP接口的程序)
* VOICEROID2: https://www.ah-soft.com/product/
* VOICEVOX: https://voicevox.hiroshiba.jp/
* A.I.VOICE: https://aivoice.jp/

# 配置文件示例
将下列内容保存到`mascots.json`，然后将三个示例文件夹复制到exe程序所在目录即可。
```JSON
{
	"characters": [
		{
			"path": "ずんだもん立ち絵素材改1.0",
			"zoom": 1,
			"flipx": false,
			"flipy": true,
			"name": "俊达萌",
			"color1": "#58A33C",
			"color2": "white",
			"definedWidthPx": 300,
			"definedHeightPx": 0,
			"faceTowards": false
		},
		{
			"path": "栗田まろん立ち素材",
			"zoom": 1,
			"flipx": false,
			"flipy": false,
			"name": "栗田Maron",
			"color1": "#B9908C",
			"color2": "white",
			"definedWidthPx": 300,
			"definedHeightPx": 0,
			"faceTowards": false
		},
		{
			"path": "きりたん立ち素材",
			"zoom": 1,
			"flipx": false,
			"flipy": false,
			"name": "东北切蒲英",
			"color1": "#934060",
			"color2": "white",
			"definedWidthPx": 300,
			"definedHeightPx": 0,
			"faceTowards": false
		}
	],
	"seats": [
		{
			"xPercent": 0.1,
			"yPercent": 0.75,
			"enabled": true,
			"character": 0
		},
		{
			"xPercent": 0.9,
			"yPercent": 0.75,
			"enabled": true,
			"character": 1
		},
		{
			"xPercent": 0.5,
			"yPercent": 0.75,
			"enabled": true,
			"character": 2
		}
	],
	"maxMsgRecordsNum": 10,
	"showManagerWindowOnStartup": true,
	"port": 20042,
	"windowSafeAreaExtendRate": 1.25,
	"minLineBreakPos": 30,
	"maxLineBreakPos": 100
}
```

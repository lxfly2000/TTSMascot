const {app, BrowserWindow, Tray, Menu, ipcMain, screen} = require('electron');
const fs = require('fs');
const TTSServer = require('./ttsServer');

let managerWindow=null;
let appTray=null;
var canWindowClose=false;

function ClickShowWindow(){
    if(managerWindow===null){
        createManagerWindow();
    }else{
        managerWindow.show();
        managerWindow.webContents.send('showConfig',global.mascotData);
    }
}

function setTray(){
    let trayMenuTemplate=[{
        label: '显示主窗口(&S)',
        click: ClickShowWindow
    },{
        label: '退出(&E)',
        click: function(){
            canWindowClose=true;
            app.quit();
        }
    }];
    appTray=new Tray('app.ico');
    const contextMenu=Menu.buildFromTemplate(trayMenuTemplate);
    appTray.setToolTip('TTS Mascot');
    appTray.setContextMenu(contextMenu);
    appTray.on('click',ClickShowWindow);
}

function createManagerWindow(){
    Menu.setApplicationMenu(null);
    // 创建浏览器窗口。
	managerWindow = new BrowserWindow({
		width: 800,
		height: 600,
        show: global.mascotData.showManagerWindowOnStartup,
		/*transparent: true,
		frame: false,*/
		webPreferences: {
			//preload: path.join(__dirname, 'preload.js'),//这一项必须使用绝对路径
			nodeIntegration: true,//要想在浏览器环境中调用Require，需要关闭隔离选项
			contextIsolation: false
		}
	});

	// 然后加载应用的 index.html。
	managerWindow.loadFile('mascotmanagerwindow.htm');

	// 打开开发者工具
	//managerWindow.webContents.openDevTools();

	// 当 window 被关闭，这个事件会被触发。
	managerWindow.on('closed', () => {
        saveMascotData();
		// 取消引用 window 对象，如果你的应用支持多窗口的话，
		// 通常会把多个 window 对象存放在一个数组里面，
		// 与此同时，你应该删除相应的元素。
		managerWindow = null;
	});
    managerWindow.on('close',function(e){
        managerWindow.hide();
        if(!canWindowClose){
            e.preventDefault();
        }
    });
    if(appTray===null){
        setTray();
    }
    managerWindow.webContents.send('showConfig',global.mascotData);
    ipcMain.on('saveConfig',(event,data)=>{
        global.mascotData=data;
        saveMascotData();
    });
}

const mascotJsonFileName='mascots.json';
const defaultMascotJson={
    //TODO:构建默认的配置
    characters: [
        {
            path: "ずんだもん立ち絵素材改1.0",
            zoom: 1,
            flipx: false,
            flipy: false,
            name: "俊达萌",
            color: "green",
            definedWidthPx: 300,
            definedHeightPx: 0
        }
    ],
    seats: [
        {
            xPercent: 0.1,
            yPercent: 0.8,
            enabled: true,
            character: 0
        },
        {
            xPercent: 0.9,
            yPercent: 0.8,
            enabled: true,
            character: -1
        }
    ],
    maxMsgRecordsNum: 10,
    showManagerWindowOnStartup: true,
    port: 20042,
    windowSafeAreaExtendRate: 1.25
};

/**
 * 读取角色配置
 */
function readMascotData(){
    try{
        //合并JSON项目
        global.mascotData=Object.assign(defaultMascotJson,JSON.parse(fs.readFileSync(mascotJsonFileName,'utf-8')));
    }catch(e){
        console.error(e);
        global.mascotData=defaultMascotJson;
    }
}

/**
 * 保存角色配置
 */
function saveMascotData(){
    try{
        fs.writeFileSync(mascotJsonFileName,JSON.stringify(global.mascotData,null,'\t'));
    }catch(e){
        console.error(e);
    }
}

/**
 * 角色管理器主函数
 */
function mascotManagerMain(){
    readMascotData();
    loadScene();
    if(!TTSServer.isServerRunning()){
        TTSServer.startServer();
    }
    createManagerWindow();
}

module.exports={
    mascotManagerMain,
    readMascotData,
    saveMascotData
};

//{seatWindow:window,seatCharacter:character}
global.seatWindows=[];

function loadScene(){
    let screenSize=screen.getPrimaryDisplay().workAreaSize;
    let seats=global.mascotData.seats;
    const borderLength=200;
    //i指的是seat的编号
    for(var i=0;i<seats.length;i++){
        let sw=new BrowserWindow({
            x:Math.floor(screenSize.width*seats[i].xPercent-borderLength/2),//必须指定整数
            y:Math.floor(screenSize.height*seats[i].yPercent-borderLength/2),
            width:Math.floor(borderLength/2),
            height:Math.floor(borderLength/2),
            useContentSize:true,
            frame:false,
            transparent:true,
            alwaysOnTop:true,
            show:seats[i].enabled,
            webPreferences:{
                nodeIntegration:true,
                contextIsolation:false
            }
        });
        sw.loadFile('characterWindow.htm');
        let sc={seatWindow:sw,seatCharacter:null};
        if(seats[i].character>=0){
            const Character=require('./'+global.mascotData.characters[seats[i].character].path+'/character.js');
            sc.seatCharacter=new Character(sw,i);
            sc.seatCharacter.loadCharacter();
        }else{
            sw.webContents.send('setInfo','Seat: '+i);
        }
        global.seatWindows.push(sc);
    }
}

function unloadScene(){
    for(var i=0;i<seatWindows.length;i++){
        global.seatWindows[i].seatWindow.destroy();
        global.seatWindows[i].seatCharacter.leave();
    }
    global.seatWindows=[];
}
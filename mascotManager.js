const {app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage} = require('electron');
const fs = require('fs');
const TTSServer = require('./ttsserver');//在Windows上可以忽略大小写，但是在Linux上，还有打包成ASAR的情况下需要区分大小写

let managerWindow=null;
let appTray=null;
global.canWindowClose=false;

function ClickShowSettings(){
    if(managerWindow===null){
        createManagerWindow();
    }else{
        managerWindow.show();
        managerWindow.webContents.send('showConfig',global.mascotData);
    }
}

function ShowAllCharacters(){
    for(var i=0;i<global.seatWindows.length;i++){
        global.seatWindows[i].seatWindow.show();
    }
}

function OpenWebIndex(){
    shell.openExternal('http://localhost:'+global.mascotData.port);
}

function setTray(){
    let trayMenuTemplate=[{
        label: '打开控制页面(&B)',
        click: OpenWebIndex
    },{
        label: '显示所有角色窗口(&C)',
        click: ShowAllCharacters
    },{
        label: '设置(&S)',
        click: ClickShowSettings
    },{
        label: '退出(&E)',
        click: function(){
            global.canWindowClose=true;
            app.quit();
        }
    }];
    appTray=new Tray(app.getAppPath()+'/app.ico');//注意打包后的路径问题
    const contextMenu=Menu.buildFromTemplate(trayMenuTemplate);
    appTray.setToolTip('TTS Mascot');
    appTray.setContextMenu(contextMenu);
    appTray.on('click',ClickShowSettings);
}

function createManagerWindow(){
    Menu.setApplicationMenu(null);
    // 创建浏览器窗口。
	managerWindow = new BrowserWindow({
		width: 400,
		height: 300,
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
	managerWindow.loadFile('mascotManagerWindow.htm');

	// 打开开发者工具
	//managerWindow.webContents.openDevTools();

	// 当 window 被关闭，这个事件会被触发。
	managerWindow.on('closed', () => {
        global.saveMascotData();
		// 取消引用 window 对象，如果你的应用支持多窗口的话，
		// 通常会把多个 window 对象存放在一个数组里面，
		// 与此同时，你应该删除相应的元素。
		managerWindow = null;
	});
    managerWindow.on('close',function(e){
        managerWindow.hide();
        if(!global.canWindowClose){
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
    //构建默认的配置
    characters: [
        {
            path: "ずんだもん立ち絵素材改1.0",
            zoom: 1,
            flipx: false,
            flipy: true,
            name: "俊达萌",
            color1: "#58A33C",
            color2: "white",
            definedWidthPx: 300,
            definedHeightPx: 0,
            faceTowards: false//false为向左或居中，true为向右
        },
        {
            path: "栗田まろん立ち素材",
            zoom: 1,
            flipx: false,
            flipy: false,
            name: "栗田Maron",
            color1: "#B9908C",
            color2: "white",
            definedWidthPx: 300,
            definedHeightPx: 0,
            faceTowards: false//false为向左或居中，true为向右
        },{
            path:"きりたん立ち素材",
            zoom:1,
            flipx:false,
            flipy:false,
            name:"东北切蒲英",
            color1:"#934060",
            color2:"white",
            definedWidthPx:300,
            definedHeightPx:0,
            faceTowards:false//false为向左或居中，true为向右
        }
    ],
    seats: [
        {
            xPercent: 0.1,
            yPercent: 0.75,
            enabled: true,
            character: 0
        },
        {
            xPercent: 0.9,
            yPercent: 0.75,
            enabled: true,
            character: 1
        },{
            xPercent: 0.5,
            yPercent: 0.75,
            enabled: true,
            character: 2
        }
    ],
    maxMsgRecordsNum: 10,
    showManagerWindowOnStartup: true,
    port: 20042,
    windowSafeAreaExtendRate: 1.25,
    minLineBreakPos:30,
    maxLineBreakPos:100
};

global.predefinedSeats=[
    {xPercent:0.1,yPercent:0.25},
    {xPercent:0.5,yPercent:0.25},
    {xPercent:0.9,yPercent:0.25},
    {xPercent:0.1,yPercent:0.5},
    {xPercent:0.5,yPercent:0.5},
    {xPercent:0.9,yPercent:0.5},
    {xPercent:0.1,yPercent:0.75},
    {xPercent:0.5,yPercent:0.75},
    {xPercent:0.9,yPercent:0.75}
];

/**
 * 读取角色配置
 */
global.readMascotData=function(){
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
global.saveMascotData=function(){
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
    global.readMascotData();
    loadScene();
    if(!TTSServer.isServerRunning()){
        TTSServer.startServer();
    }
    createManagerWindow();
}

module.exports={mascotManagerMain};

//{seatWindow:window,seatPopup:window,seatCharacter:character实例}
//记录所有Character的实例，由于是直接通过seats下标设置元素的，可能有undefined的值
global.seatWindows=[];
global.findSeatIndexByCharacterIndex=function(characterIndex){
    let seats=global.mascotData.seats;
    for(var i=0;i<seats.length;i++){
        if(seats[i].character===characterIndex){
            return i;
        }
    }
    return -1;
};
global.findSeatIndexByCharacterName=function(characterName){
    let seats=global.mascotData.seats;
    for(var i=0;i<seats.length;i++){
        if(seats[i].character>=0&&global.mascotData.characters[seats[i].character].name===characterName){
            return i;
        }
    }
    return -1;
};
global.findCharacterIndexByName=function(name){
    let characters=global.mascotData.characters;
    for(var i=0;i<characters.length;i++){
        if(characters[i].name===name){
            return i;
        }
    }
    return -1;
}

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
        global.seatWindows[i]=sc;
        if(seats[i].character>=0){
            const Character=require('./characterCommon.js');
            sc.seatCharacter=new Character(sw,i,global.mascotData.characters[seats[i].character].path);
            sc.seatCharacter.loadCharacter();
        }else{
            sw.webContents.send('setInfo','Seat: '+i);
        }
    }
}

function unloadScene(){
    for(var i=0;i<seatWindows.length;i++){
        global.seatWindows[i].seatWindow.destroy();
        global.seatWindows[i].seatCharacter.leaveCharacter();
    }
    global.seatWindows=[];
}

global.seatChangeCharacter=function(_seatIndex,_characterIndex){
    let seats=global.mascotData.seats;
    let characters=global.mascotData.characters;
    let beforeCharacter=characters[seats[_seatIndex].character];
    //false左true右
    var beforeTowards=beforeCharacter.flipy^beforeCharacter.faceTowards;
    characters[_characterIndex].flipy=beforeTowards^characters[_characterIndex].faceTowards;
    global.seatWindows[_seatIndex].seatCharacter.leaveCharacter();
    const Character=require('./'+global.mascotData.characters[seats[_seatIndex].character=_characterIndex].path+'/character.js');
    global.seatWindows[_seatIndex].seatCharacter=new Character(global.seatWindows[_seatIndex].seatWindow,_seatIndex);
    global.seatWindows[_seatIndex].seatCharacter.loadCharacter();
}
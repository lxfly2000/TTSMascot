const fs = require('fs');
const PSD = require('psd');
const {screen,ipcMain, BrowserWindow, dialog, app} = require('electron');

function requireCharacterJS(path,characterInstance,exposes){
    path+='/character.js';
    var str=fs.readFileSync(path).toString();
    var m=new module.constructor();
    m._compile(str,path);
    return m.exports(characterInstance,exposes);
}

class CharacterCommon{
    constructor(bw,_seatIndex,_characterPath){
        this.usingWindow=bw;
        this.seatIndex=_seatIndex;
        this.characterPath=_characterPath;
        this.characterModule=requireCharacterJS(this.characterPath,this,{sendAudioData,finishSpeaking});
        this._speakVoice=this.characterModule.speakVoice;
        global.seatWindows[this.seatIndex].seatPopup=null;
        global.seatWindows[this.seatIndex].widthPopup=0;
        global.seatWindows[this.seatIndex].heightPopup=0;
        this.speaking=false;
        //这个指绝对位置，窗口中心坐标
        this.xPopup=0;
        this.yPopup=0;
        this.currentState='normal';
        //psdResources由程序动态生成，实际存储的是Image对象
        //{
        //stateName1:[data1,data2,...]
        //stateName2:[data1,data2,...]
        //...:[...]
        //}
        //其中data#又定义为下列形式：
        //{
        //psdWidth:number,
        //psdHeight:number,
        //layers:[{info:JSON,image:PNG},{info:JSON,image:PNG},...]
        //}
        //info的JSON数据为（示例）：
        //{
        //"type": "layer",
        //"visible": true,
        //"opacity": 1,
        //"blendingMode": "normal",
        //"name": "*直立",
        //"left": 236,
        //"right": 977,
        //"top": 209,
        //"bottom": 1507,
        //"height": 1298,
        //"width": 741,
        //"mask": {},
        //"image": {}
        //}
        this.psdResources={};
        this.expressionSettings=this.characterModule.expressionSettings;
        this.usingWindow.on('moved',e=>{
            const bounds=this.usingWindow.getBounds();
            let screenSize=screen.getPrimaryDisplay().workAreaSize;
            let seats=global.mascotData.seats;
            seats[this.seatIndex].xPercent=(bounds.x+bounds.width/2)/screenSize.width;
            seats[this.seatIndex].yPercent=(bounds.y+bounds.height/2)/screenSize.height;
            global.saveMascotData();
        });
        this.usingWindow.on('close',e=>{
            if(!global.canWindowClose){
                this.usingWindow.hide();
                e.preventDefault();
            }
        });
        this.waitingQueue=[];//{voice:"",subtitle:""}
        ipcMain.on('audioEnd',(event,data)=>{
            if(data===this.seatIndex){
                finishSpeaking(this);
            }
        });
        ipcMain.on('computedRect',(event,data)=>{
            //data:{seat,width,height}
            if(data.seat===this.seatIndex){
                let screenSize=screen.getPrimaryDisplay().workAreaSize;
                let s=global.mascotData.seats[this.seatIndex];
                let wPopup=global.seatWindows[this.seatIndex].seatPopup;
                global.seatWindows[this.seatIndex].widthPopup=data.width;
                global.seatWindows[this.seatIndex].heightPopup=data.height;
                var dir=this._calcPopupWindowPos(data.width,data.height);
                console.log('Popup direction: '+dir);
                var safeAreaDistance=Math.max(data.width,data.height)*(global.mascotData.windowSafeAreaExtendRate-1)/2;
                wPopup.setBounds({
                    x:Math.floor(this.xPopup-data.width/2-safeAreaDistance),
                    y:Math.floor(this.yPopup-data.height/2-safeAreaDistance),
                    width:Math.ceil(data.width+safeAreaDistance*2),
                    height:Math.ceil(data.height+safeAreaDistance*2)
                });
                //减了一个6分高度是因为立绘的嘴通常在上半身2/3处
                var cWindowHeight=this.usingWindow.getBounds().height/global.mascotData.windowSafeAreaExtendRate;
                var setRotData={
                    rot:this._calcAngle(this.xPopup,this.yPopup,screenSize.width*s.xPercent,screenSize.height*s.yPercent-cWindowHeight/6),
                    arrowDirection:(dir+2)%4
                };
                wPopup.webContents.send('setRotDeg',setRotData);
                wPopup.show();
            }
        });
        for(var k in this.expressionSettings){
            this.psdResources[k]=[];
            for(var i=0;i<this.expressionSettings[k].layerSettings.length;i++){
                this._loadPSD(k,this.expressionSettings[k].layerSettings[i].fileName,this.expressionSettings[k].layerSettings[i].layers);
            }
        }
    }

    _calcAngle(xFrom,yFrom,xTo,yTo){
        console.debug(`[${xFrom*2.5},${yFrom*2.5}]->[${xTo*2.5},${yTo*2.5}] => ${Math.atan2(yTo-yFrom,xTo-xFrom)*180/Math.PI} degree`);
        return Math.atan2(yTo-yFrom,xTo-xFrom);
    }

    //返回值0-3分别表示气泡在右，下，左，上方，-1表示没有合适的位置
    _calcPopupWindowPos(w,h){
        let character=global.mascotData.characters[global.mascotData.seats[this.seatIndex].character];
        let faceTowards=character.flipy^character.faceTowards;//false:左 true:右
        let headRect=this.usingWindow.getBounds();
        headRect.x+=(headRect.width-headRect.width/global.mascotData.windowSafeAreaExtendRate)/2;
        headRect.y+=(headRect.height-headRect.height/global.mascotData.windowSafeAreaExtendRate)/2;
        headRect.width/=global.mascotData.windowSafeAreaExtendRate;
        headRect.height=headRect.height/global.mascotData.windowSafeAreaExtendRate/2;
        let x,y;
        if(faceTowards){
            x=headRect.x+headRect.width/2;
        }else{
            x=headRect.x+headRect.width/2-w;
        }
        y=headRect.y+headRect.height+(global.mascotData.windowSafeAreaExtendRate-1)*h/2;
        //先往下找
        for(;!this._isRectOverScreen(x,y,w,h);y++){
            if(this._isRectNoOverlap(x,y,w,h)){
                this.xPopup=x+w/2;
                this.yPopup=y+h/2;
                return 1;
            }
        }
        //再往侧方向找
        if(faceTowards){
            x=headRect.x+headRect.width+(global.mascotData.windowSafeAreaExtendRate-1)*w/2;
            y=headRect.y;
            for(;!this._isRectOverScreen(x,y,w,h);x++){
                if(this._isRectNoOverlap(x,y,w,h)){
                    this.xPopup=x+w/2;
                    this.yPopup=y+h/2;    
                    return 0;
                }
            }
        }else{
            x=headRect.x-w-(global.mascotData.windowSafeAreaExtendRate-1)*w/2;
            y=headRect.y;
            for(;!this._isRectOverScreen(x,y,w,h);x--){
                if(this._isRectNoOverlap(x,y,w,h)){
                    this.xPopup=x+w/2;
                    this.yPopup=y+h/2;    
                    return 2;
                }
            }
        }
        //往上找
        if(faceTowards){
            x=headRect.x+headRect.width/2;
        }else{
            x=headRect.x+headRect.width/2-w;
        }
        y=headRect.y-h-(global.mascotData.windowSafeAreaExtendRate-1)*h/2;
        for(;!this._isRectOverScreen(x,y,w,h);y--){
            if(this._isRectNoOverlap(x,y,w,h)){
                this.xPopup=x+w/2;
                this.yPopup=y+h/2;
                return 3;
            }
        }
        //再往另一侧方向找
        if(!faceTowards){
            x=headRect.x+headRect.width+(global.mascotData.windowSafeAreaExtendRate-1)*w/2;
            y=headRect.y;
            for(;!this._isRectOverScreen(x,y,w,h);x++){
                if(this._isRectNoOverlap(x,y,w,h)){
                    this.xPopup=x+w/2;
                    this.yPopup=y+h/2;    
                    return 0;
                }
            }
        }else{
            x=headRect.x-w-(global.mascotData.windowSafeAreaExtendRate-1)*w/2;
            y=headRect.y;
            for(;!this._isRectOverScreen(x,y,w,h);x--){
                if(this._isRectNoOverlap(x,y,w,h)){
                    this.xPopup=x+w/2;
                    this.yPopup=y+h/2;    
                    return 2;
                }
            }
        }
        this.xPopup=headRect.x+headRect.width/2;
        this.yPopup=headRect.y-h/2-(global.mascotData.windowSafeAreaExtendRate-1)*h/2;
        return -1;
    }

    _isRectNoOverlap(x,y,w,h){
        for(var i=0;i<global.seatWindows.length;i++){
            if(i!==this.seatIndex&&this._checkOverlapWithPopupWindow(x,y,w,h,i)){
                return false;
            }
            if(this._checkOverlapWithCharacterWindow(x,y,w,h,i)){
                return false;
            }
        }
        return true;
    }
    
    _isRectOverScreen(x,y,w,h){
        let screenSize=screen.getPrimaryDisplay().workAreaSize;
        return x<0||y<0||x+w>=screenSize.width||y+h>=screenSize.height;
    }

    //返回true表示有重叠部分
    _checkOverlapWithCharacterWindow(x,y,w,h,seat){
        if(seat>=global.seatWindows.length){
            return false;
        }
        let window=global.seatWindows[seat].seatWindow.getBounds();
        window.x+=(window.width-window.width/global.mascotData.windowSafeAreaExtendRate)/2;
        window.y+=(window.height-window.height/global.mascotData.windowSafeAreaExtendRate)/2;
        window.width/=global.mascotData.windowSafeAreaExtendRate;
        window.height=window.height/global.mascotData.windowSafeAreaExtendRate/2;//此处/2是因为立绘的下半身是可以适当覆盖的
        return Math.max(0,Math.min(x+w,window.x+window.width)-Math.max(x,window.x))*Math.max(0,Math.min(y+h,window.y+window.height)-Math.max(y,window.y))>0;
    }

    //返回true表示有重叠部分
    _checkOverlapWithPopupWindow(x,y,w,h,seat){
        if(seat>=global.seatWindows.length||global.seatWindows[seat].seatPopup===null){
            return false;
        }
        let window=global.seatWindows[seat].seatPopup.getBounds();
        window.x+=(window.width-global.seatWindows[seat].widthPopup)/2;
        window.y+=(window.height-global.seatWindows[seat].heightPopup)/2;
        window.width=global.seatWindows[seat].widthPopup;
        window.height=global.seatWindows[seat].heightPopup;
        return Math.max(0,Math.min(x+w,window.x+window.width)-Math.max(x,window.x))*Math.max(0,Math.min(y+h,window.y+window.height)-Math.max(y,window.y))>0;
    }

    _loadPSD(stateName,fileName,enabledLayers){
        var psdpath=this.characterPath+'/'+fileName;
        var psdfile=PSD.fromFile(psdpath);
        //根据enabledLayers调整图层
        if(psdfile.parse()){
            let psdinfo=psdfile.tree().export();
            var layeredImage={
                psdWidth:psdinfo.document.width,
                psdHeight:psdinfo.document.height,
                layers:[]
            };
            for(var layerPath of enabledLayers){
                var layer=psdfile.tree().childrenAtPath(layerPath)[0];
                if(layer.get('type')!=='layer'){
                    dialog.showErrorBox(`加载"${fileName}"时出错`,`状态：${stateName}\n图层：${layerPath}\n该图层的类型是"${layer.get('type')}"，请指定一个包含图像的图层。`);
                    app.exit(-1);
                }
                layeredImage.layers.push({
                    info:layer.export(),
                    image:layer.toPng()
                });
            }
            this.psdResources[stateName].push(layeredImage);
        }
    }

    _checkStringState(str){
        if(str===''){
            return 'normal';
        }
        for(var k in this.expressionSettings){
            for(var i=0;i<this.expressionSettings[k].keywords.length;i++){
                if(str.search(this.expressionSettings[k].keywords[i])!==-1){
                    return k;
                }
            }
        }
        return 'speaking';
    }

    _getStatePngRandom(stateName){
        return this.psdResources[stateName][Math.floor(Math.random()*this.psdResources[stateName].length)];
    }
    
    loadCharacter(){
        let screenSize=screen.getPrimaryDisplay().workAreaSize;
        let s=global.mascotData.seats[this.seatIndex];
        let c=global.mascotData.characters[s.character];
        let setData={
            layeredImage:null,
            name:c.name,
            width:c.definedWidthPx*c.zoom,
            height:c.definedHeightPx*c.zoom,
            flipx:c.flipx,
            flipy:c.flipy,
            seat:this.seatIndex
        };
        var firstImageData=this.psdResources.normal[0];
        if(setData.width===0){
            setData.width=firstImageData.psdWidth*setData.height/firstImageData.psdHeight;
        }else if(setData.height===0){
            setData.height=firstImageData.psdHeight*setData.width/firstImageData.psdWidth;
        }
        const windowSafeAreaExtendRate=global.mascotData.windowSafeAreaExtendRate;
        this.usingWindow.setBounds({
            x:Math.floor(screenSize.width*s.xPercent-Math.ceil(setData.width*windowSafeAreaExtendRate/2)),
            y:Math.floor(screenSize.height*s.yPercent-Math.ceil(setData.height*windowSafeAreaExtendRate/2)),
            width:Math.ceil(setData.width*windowSafeAreaExtendRate),
            height:Math.ceil(setData.height*windowSafeAreaExtendRate)
        });
        var psdData=this._getStatePngRandom(this.currentState);
        var asyncI=0;
        var thenTaskUsingWindow=this.usingWindow;
        var thenTask=function(strBase64){
            psdData.layers[asyncI].image=strBase64;
            asyncI++;
            if(asyncI>=psdData.layers.length){
                setData.layeredImage=psdData;
                thenTaskUsingWindow.webContents.send('setCharacter',setData);
            }else{
                imageToBase64(psdData.layers[asyncI].image).then(thenTask);
            }
        };
        imageToBase64(psdData.layers[asyncI].image).then(thenTask);
    }

    isSpeaking(){
        return this.speaking;
    }

    queueSpeak(_str,_subtitle){
        this.waitingQueue.push({voice:_str,subtitle:_subtitle});
        this._speakIfIdle();
    }

    _speakIfIdle(){
        if(!this.isSpeaking()&&this.waitingQueue.length>0){
            var entry=this.waitingQueue.shift();
            this._speak(entry.voice,entry.subtitle);
        }
    }

    _speak(str,subtitle){
        if(this._processInstructions(subtitle)){
            this.speaking=true;
            this._speakVoice(str);
            this._speakShowMsg(subtitle);
        }
    }

    //返回值表示是否还应继续语音合成和字幕显示
    _processInstructions(/**@type {String}*/str){
        let seats=global.mascotData.seats;
        let characters=global.mascotData.characters;
        if(str==='[转向]'){
            characters[seats[this.seatIndex].character].flipy=!characters[seats[this.seatIndex].character].flipy;
            global.saveMascotData();
            this.loadCharacter();
            return false;
        }
        let percentMatch=str.match(/^\[(\d+)%\]$/);
        if(percentMatch!==null){
            characters[seats[this.seatIndex].character].zoom=parseInt(percentMatch[1])/100;
            global.saveMascotData();
            this.loadCharacter();
            return false;
        }
        const posKeywords=['左上','上','右上','左','中','右','左下','下','右下'];
        let posIndex=posKeywords.findIndex(e=>'['+e+']'===str);
        if(posIndex!==-1){
            seats[this.seatIndex].xPercent=global.predefinedSeats[posIndex].xPercent;
            seats[this.seatIndex].yPercent=global.predefinedSeats[posIndex].yPercent;
            global.saveMascotData();
            this.loadCharacter();
            return false;
        }
        let state=this._checkStringState(str);
        if(state!==this.currentState){
            this.currentState=state;
            this.loadCharacter();
        }
        return true;
    }

    _breakToMultilineText(str){
        const minLineBreakPos=global.mascotData.minLineBreakPos;
        const maxLineBreakPos=global.mascotData.maxLineBreakPos;
        //从最小断句数起，若遇到断字符，添加换行，重新计数，若到最大断句数，无条件换行
        let multilineStr='';
        var lineCounter=0;
        const regexBreakChars=/[,.!?:;\- ，。！？、：；…—]/;
        for(var i=0;i<str.length;i++){
            multilineStr+=str[i];
            lineCounter++;
            if(str[i]==='\n'){
                lineCounter=0;
            }else if(lineCounter>=maxLineBreakPos){
                multilineStr+='\n';
                lineCounter=0;
            }else if(lineCounter>=minLineBreakPos&&str[i].match(regexBreakChars)!==null){
                multilineStr+='\n';
                lineCounter=0;
            }
        }
        return multilineStr;
    }

    //setText:{seat,msg,color1,color2}
    _speakShowMsg(subtitle){
        if(subtitle===''){
            return;
        }
        subtitle=this._breakToMultilineText(subtitle);
        let s=global.mascotData.seats[this.seatIndex];
        let c=global.mascotData.characters[s.character];
        let screenSize=screen.getPrimaryDisplay().workAreaSize;
        if(global.seatWindows[this.seatIndex].seatPopup===null){
            global.seatWindows[this.seatIndex].seatPopup=new BrowserWindow({
                width:screenSize.width,
                height:screenSize.height,
                useContentSize:true,
                frame:false,
                transparent:true,
                alwaysOnTop:true,
                show:false,
                skipTaskbar:true,
                webPreferences:{
                    nodeIntegration:true,
                    contextIsolation:false
                }
            });
            global.seatWindows[this.seatIndex].seatPopup.loadFile('textBubbleWindow.htm');
        }else{
            global.seatWindows[this.seatIndex].seatPopup.setSize(screenSize.width,screenSize.height);
        }
        var setTextData={
            seat:this.seatIndex,
            msg:subtitle,
            color1:c.color1,
            color2:c.color2
        };
        global.seatWindows[this.seatIndex].seatPopup.webContents.send('setText',setTextData);
    }

    leaveCharacter(){
        //TODO:
    }
}

//需要提供给各角色脚本的函数
function sendAudioData(character,u8arrayData){
    character.usingWindow.webContents.send('playAudio',audioToBase64(u8arrayData));
}

//需要提供给各角色脚本的函数
function finishSpeaking(character){
    character._processInstructions('');
    character.speaking=false;
    console.log('Speaking voice finished.');
    if(global.seatWindows[character.seatIndex].seatPopup!==null){
        global.seatWindows[character.seatIndex].seatPopup.destroy();
        global.seatWindows[character.seatIndex].seatPopup=null;
    }
    character._speakIfIdle();
}

function imageToBase64(image) {
    return new Promise((resolve, reject) => {
        if(typeof(image)==='string'){//若image已经是字符型说明已经被解析过了
            resolve(image);
            return;
        }
        const chunks = [];

        image.pack();  // [1]
        image.on('data', (chunk) => {
            chunks.push(chunk);  // [2]
        });
        image.on('end', () => {
            resolve(`data:image/png;base64,${Buffer.concat(chunks).toString('base64')}`);  // [3]
        });
        image.on('error', (err) => {
            reject(err);
        });
    });
};

function audioToBase64(chunks){
    return 'data:audio/wav;base64,'+Buffer.concat(chunks).toString('base64');
}

module.exports=CharacterCommon;

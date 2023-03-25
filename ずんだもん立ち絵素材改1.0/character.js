const HTTP = require('http');
const PSD = require('psd');
const {screen,ipcMain, BrowserWindow} = require('electron');

class Character{
    constructor(bw,_seatIndex){
        this.usingWindow=bw;
        this.seatIndex=_seatIndex;
        global.seatWindows[this.seatIndex].seatPopup=null;
        global.seatWindows[this.seatIndex].widthPopup=0;
        global.seatWindows[this.seatIndex].heightPopup=0;
        this.speaking=false;
        this.psdWidth=0;
        this.psdHeight=0;
        //这个指绝对位置，窗口中心坐标
        this.xPopup=0;
        this.yPopup=0;
        this.currentState='normal';
        //psdResources由程序动态生成，实际存储的是Image对象
        //{
        //stateName1:[imageBase64Data1,imageBase64Data2,...]
        //stateName2:[imageBase64Data1,imageBase64Data2,...]
        //...:[...]
        //}
        this.psdResources={};
        this.expressionSettings={
            //通常状态
            normal:{keywords:[],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}//TODO:设定图层
            ]},
            //说话状态
            speaking:{keywords:[],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //开心状态
            happy:{keywords:['嗯！','哈哈','是的','是呢','开心'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //感叹状态
            exclam:{keywords:['哦！','绝了','感叹'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //严肃或思考中的状态
            serious:{keywords:['什么','吗？','严肃','思考'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //悲伤、痛苦或哭泣状态
            sad:{keywords:['难受','不要','抱歉','唔唔','啊啊','悲伤','痛苦','哭泣'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //迷惑状态
            confused:{keywords:['嗯…','怎么','迷惑'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //尴尬状态
            embarrassed:{keywords:['原来','尬'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //挑逗或欲望状态
            joyful:{keywords:['让我','想要','你说','是不','挑逗','欲望'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]},
            //生气状态
            angry:{keywords:['哼！','滚啊','你马','生气'],layerSettings:[
                {fileName:'ずんだもん立ち絵素材改.psd',layers:[]}
            ]}
        };
        this.usingWindow.on('moved',e=>{
            const bounds=this.usingWindow.getBounds();
            let screenSize=screen.getPrimaryDisplay().workAreaSize;
            let seats=global.mascotData.seats;
            seats[this.seatIndex].xPercent=(bounds.x+bounds.width/2)/screenSize.width;
            seats[this.seatIndex].yPercent=(bounds.y+bounds.height/2)/screenSize.height;
            global.saveMascotData();
        });
        this.waitingQueue=[];//{voice:"",subtitle:""}
        ipcMain.on('audioEnd',(event,data)=>{
            if(data===this.seatIndex){
                this.speaking=false;
                console.log('Speaking voice finished.');
                this._speakIfIdle();
                if(global.seatWindows[this.seatIndex].seatPopup!==null){
                    global.seatWindows[this.seatIndex].seatPopup.destroy();
                    global.seatWindows[this.seatIndex].seatPopup=null;
                }
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
                this._calcPopupWindowPos(data.width,data.height);
                wPopup.setBounds({
                    x:Math.floor(this.xPopup-Math.ceil(data.width*global.mascotData.windowSafeAreaExtendRate/2)),
                    y:Math.floor(this.yPopup-Math.ceil(data.height*global.mascotData.windowSafeAreaExtendRate/2)),
                    width:Math.ceil(data.width*global.mascotData.windowSafeAreaExtendRate),
                    height:Math.ceil(data.height*global.mascotData.windowSafeAreaExtendRate)
                });
                //减了一个6分高度是因为立绘的嘴通常在上半身2/3处
                wPopup.webContents.send('setRotDeg',Math.atan2(screenSize.height*s.yPercent-this.psdHeight/6-this.yPopup,screenSize.width*s.xPercent-this.xPopup)*180/Math.PI);
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

    _calcPopupWindowPos(w,h){
        let character=global.mascotData.characters[global.mascotData.seats[this.seatIndex].character];
        let faceTowards=character.flipy^character.faceTowards;//false:左 true:右
        let headRect=this.usingWindow.getBounds();
        headRect.x+=(headRect.width-headRect.width/global.mascotData.windowSafeAreaExtendRate)/2;
        headRect.y+=(headRect.height-headRect.height/global.mascotData.windowSafeAreaExtendRate)/2;
        headRect.width/=global.mascotData.windowSafeAreaExtendRate;
        headRect.height=headRect.height/global.mascotData.windowSafeAreaExtendRate/2;
        let x=headRect.x,y=headRect.y+headRect.height;
        //先往下找
        for(;!this._isRectOverScreen(x,y,w,h);y++){
            if(this._isRectNoOverlap(x,y,w,h)){
                this.xPopup=x+w/2;
                this.yPopup=y+h/2;
                return;
            }
        }
        //再往侧方向找
        if(faceTowards){
            x=headRect.x+headRect.width;
            y=headRect.y;
            for(;!this._isRectOverScreen(x,y,w,h);x++){
                if(this._isRectNoOverlap(x,y,w,h)){
                    this.xPopup=x+w/2;
                    this.yPopup=y+h/2;    
                    return;
                }
            }
        }else{
            x=headRect.x-w;
            y=headRect.y;
            for(;!this._isRectOverScreen(x,y,w,h);x--){
                if(this._isRectNoOverlap(x,y,w,h)){
                    this.xPopup=x+w/2;
                    this.yPopup=y+h/2;    
                    return;
                }
            }
        }
        //最后往上找
        x=headRect.x;
        y=headRect.y-h;
        for(;this._isRectOverScreen(x,y,w,h);y--){
            if(this._isRectNoOverlap(x,y,w,h)){
                this.xPopup=x+w/2;
                this.yPopup=y+h/2;
                return;
            }
        }
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
        var psdpath=__dirname+'/'+fileName;
        var psdfile=PSD.fromFile(psdpath);
        //TODO:根据enabledLayers调整图层
        if(psdfile.parse()){
            let psdinfo=psdfile.tree().export();
            this.psdWidth=psdinfo.document.width;
            this.psdHeight=psdinfo.document.height;
            this.psdResources[stateName].push(psdfile.image.toPng());
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
            url:null,
            name:c.name,
            width:c.definedWidthPx*c.zoom,
            height:c.definedHeightPx*c.zoom,
            flipx:c.flipx,
            flipy:c.flipy,
            seat:this.seatIndex
        };
        if(setData.width===0){
            setData.width=this.psdWidth*setData.height/this.psdHeight;
        }else if(setData.height===0){
            setData.height=this.psdHeight*setData.width/this.psdWidth;
        }
        const windowSafeAreaExtendRate=global.mascotData.windowSafeAreaExtendRate;
        this.usingWindow.setBounds({
            x:Math.floor(screenSize.width*s.xPercent-Math.ceil(setData.width*windowSafeAreaExtendRate/2)),
            y:Math.floor(screenSize.height*s.yPercent-Math.ceil(setData.height*windowSafeAreaExtendRate/2)),
            width:Math.ceil(setData.width*windowSafeAreaExtendRate),
            height:Math.ceil(setData.height*windowSafeAreaExtendRate)
        });
        var png=this._getStatePngRandom(this.currentState);
        imageToBase64(png).then(contentBase64String=>{
            setData.url=contentBase64String;
            this.usingWindow.webContents.send('setCharacter',setData);
        });
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
            }
            if(str[i].match(regexBreakChars)!==null){
                if(lineCounter>=minLineBreakPos){
                    multilineStr+='\n';
                    lineCounter=0;
                }
            }
            if(lineCounter>=maxLineBreakPos){
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
        if(global.seatWindows[this.seatIndex].seatPopup===null){
            let screenSize=screen.getPrimaryDisplay().workAreaSize;
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
            global.seatWindows[this.seatIndex].seatPopup.loadFile('textBubble.htm');
        }
        var setTextData={
            seat:this.seatIndex,
            msg:subtitle,
            color1:c.color1,
            color2:c.color2
        };
        global.seatWindows[this.seatIndex].seatPopup.webContents.send('setText',setTextData);
    }

    _speakVoice(str){
        if(str===''){
            return;
        }
        //TODO:
        //应管理一个队列
        /**@type {HTTP.RequestOptions}*/
        const option={
            hostname:'127.0.0.1',
            port:50021,
            path:'/audio_query?speaker=3&text='+encodeURI(str),
            method:'POST'
        };
        const req=HTTP.request(option,/**@type {HTTP.IncomingMessage}*/res=>{
            res.setEncoding('utf8');
            let resBody='';
            if(res.statusCode===200){
                res.on('data',thunk=>resBody+=thunk);
                res.on('end',()=>{
                    /**@type {HTTP.RequestOptions}*/
                    const option2={
                        hostname:'127.0.0.1',
                        port:50021,
                        path:'/synthesis?speaker=3',
                        method:'POST',
                        headers:{
                            'Content-Type':'application/json'
                        }
                    };
                    const req2=HTTP.request(option2,/**@type {HTTP.IncomingMessage}*/res2=>{
                        let resBody2=[];
                        if(res2.statusCode===200){
                            res2.on('data',thunk=>resBody2.push(thunk));
                            res2.on('end',()=>{
                                this.usingWindow.webContents.send('playAudio',audioToBase64(resBody2));
                                this.speaking=true;
                                console.log(`Speaking voice: "${str}"`);
                            });
                        }
                    });
                    req2.on('error',e=>console.error('Error on synthesis, please check whether VOICEVOX is running properly:\n'+e));
                    req2.write(resBody);
                    req2.end();
                });
            }
        });
        req.on('error',e=>console.error('Error on audio_query, please check whether VOICEVOX is running properly:\n'+e));
        req.end();
    }

    leaveCharacter(){
        //TODO:
    }
}

function imageToBase64(image) {
    return new Promise((resolve, reject) => {
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

module.exports=Character;

const HTTP = require('http');
const PSD = require('psd');
const {screen,ipcMain, BrowserWindow} = require('electron');

class Character{
    constructor(bw,_seatIndex){
        this.usingWindow=bw;
        this.seatIndex=_seatIndex;
        this.speaking=false;
        this.psdWidth=0;
        this.psdHeight=0;
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
        this.waitingQueue=[];//{voice:"",subtitle:""}
        ipcMain.on('audioEnd',(event,data)=>{
            if(data===this.seatIndex){
                this.speaking=false;
                console.log('Speaking voice finished.');
                this._speakIfIdle();
            }
        });
        for(var k in this.expressionSettings){
            this.psdResources[k]=[];
            for(var i=0;i<this.expressionSettings[k].layerSettings.length;i++){
                this._loadPSD(k,this.expressionSettings[k].layerSettings[i].fileName,this.expressionSettings[k].layerSettings[i].layers);
            }
        }
    }

    _loadPSD(stateName,fileName,enabledLayers){
        var psdpath=__dirname+'/'+fileName;
        var psdfile=PSD.fromFile(psdpath);
        //TODO:根据enabledLayers调整图层
        if(psdfile.parse()){
            let psdinfo=psdfile.tree.export();
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
        if(_processInstructions(subtitle)){
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
            characters[seats[this.seatIndex].character].xPercent=global.predefinedSeats[posIndex].xPercent;
            characters[seats[this.seatIndex].character].yPercent=global.predefinedSeats[posIndex].yPercent;
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

    _speakShowMsg(subtitle){
        if(subtitle===''){
            return;
        }
        //TODO:显示subtitle
        if(global.seatWindows[this.seatIndex].seatPopup===undefined){
            global.seatWindows[this.seatIndex].seatPopup=new BrowserWindow({
                //TODO:确定窗口位置等
            });
        }else{
            global.seatWindows[this.seatIndex].seatPopup.show();
            //TODO:可能还需要发送角色的窗口信息
            global.seatWindows[this.seatIndex].seatPopup.webContents.send('setSubtitle','subtitle');
        }
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

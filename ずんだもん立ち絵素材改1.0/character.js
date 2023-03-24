const HTTP = require('http');
const PSD = require('psd');
const {screen,ipcMain} = require('electron');

class Character{
    constructor(bw,_seatIndex){
        this.usingWindow=bw;
        this.seatIndex=_seatIndex;
        this.speaking=false;
        ipcMain.on('audioEnd',(event,data)=>{
            if(data===this.seatIndex){
                this.speaking=false;
                console.log('Speaking voice finished.');
            }
        });
    }
    
    loadCharacter(){
        let screenSize=screen.getPrimaryDisplay().workAreaSize;
        var psdpath=__dirname+'/ずんだもん立ち絵素材改.psd';
        var psdfile=PSD.fromFile(psdpath);
        let s=global.mascotData.seats[this.seatIndex];
        let c=global.mascotData.characters[s.character];
        if(psdfile.parse()){
            let setData={
                url:null,
                name:c.name,
                width:c.definedWidthPx*c.zoom,
                height:c.definedHeightPx*c.zoom,
                flipx:c.flipx,
                flipy:c.flipy,
                seat:this.seatIndex
            };
            let psdinfo=psdfile.tree().export();
            if(setData.width===0){
                setData.width=psdinfo.document.width*setData.height/psdinfo.document.height;
            }else if(setData.height===0){
                setData.height=psdinfo.document.height*setData.width/psdinfo.document.width;
            }
            const windowSafeAreaExtendRate=global.mascotData.windowSafeAreaExtendRate;
            this.usingWindow.setBounds({
                x:Math.floor(screenSize.width*s.xPercent-Math.ceil(setData.width*windowSafeAreaExtendRate/2)),
                y:Math.floor(screenSize.height*s.yPercent-Math.ceil(setData.height*windowSafeAreaExtendRate/2)),
                width:Math.ceil(setData.width*windowSafeAreaExtendRate),
                height:Math.ceil(setData.height*windowSafeAreaExtendRate)
            });
            var png=psdfile.image.toPng();
            imageToBase64(png).then(contentBase64String=>{
                setData.url=contentBase64String;
                this.usingWindow.webContents.send('setCharacter',setData);
            });
        }
    }

    isSpeaking(){
        return this.speaking;
    }

    speak(str){
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
                        },
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

    showMsg(str){
        //TODO:
        //应管理一个队列
    }

    leaveCharacter(){
        //TODO:
    }
}

function setLayerVisible(psdfile,layerpath,visible){
    //todo
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

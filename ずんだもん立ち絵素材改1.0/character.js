const HTTP = require('http');

const expressionSettings={
    //通常状态
    normal:{keywords:[],layerSettings:[
        {fileName:'ずんだもん立ち絵素材改.psd',layers:[//TODO:设定需要显示的图层
            '*頭_正面向き/!眉/*基本眉',
            '*頭_正面向き/!目/*普通目',
            '*頭_正面向き/!口/*むふ',
            '*頭_正面向き/!顔色/*ほっぺ基本',
            '*頭_正面向き/!枝豆/*枝豆通常',
            '*頭_正面向き/!頭',
            '!左腕/*基本',
            '!右腕/*基本(直立用)',
            '!体/*直立'
        /*]},{fileName:'ずんだもん立ち絵素材改.psd',layers:[//TODO:第二种同类表情，以此类推
            '图层/路径/1',//TODO
            '图层/路径/2',*/
        ]}
    ]},
    //说话状态
    speaking:{keywords:[],layerSettings:[
        {fileName:'ずんだもん立ち絵素材改.psd',layers:[
            '*頭_正面向き/!眉/*基本眉',
            '*頭_正面向き/!目/*普通目',
            '*頭_正面向き/!口/*ほあ',
            '*頭_正面向き/!顔色/*ほっぺ基本',
            '*頭_正面向き/!枝豆/*枝豆通常',
            '*頭_正面向き/!頭',
            '!左腕/*基本',
            '!右腕/*基本(直立用)',
            '!体/*直立'
        ]}
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

function speakVoice(str){
    if(str===''){
        return;
    }
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
                            sendAudioData(characterInstance,resBody2);
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

let characterInstance;//表示Character对象
let sendAudioData;//若需要由本程序播放音频，请调用此函数 sendAudioData(characterInstance,[WAV文件数组])
let finishSpeaking;//若是由外部程序播放音频，需要在播放完成后手动调用此函数 finishSpeaking(characterInstance)

module.exports=function(_characterInstance,_exposedFunctions){
    characterInstance=_characterInstance;
    sendAudioData=_exposedFunctions.sendAudioData;
    finishSpeaking=_exposedFunctions.finishSpeaking;
    return {expressionSettings,speakVoice};
};

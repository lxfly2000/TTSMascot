const HTTP = require('http');

const expressionSettings={
    //通常状态
    normal:{keywords:[],layerSettings:[
        {fileName:'kiritan.psd',layers:[//TODO:设定需要显示的图层
            '表情/目/8',
            '表情/口/18',
            '表情/眉/1',
            '体/1',
            '体/砲'
        /*]},{fileName:'kiritan.psd',layers:[//TODO:第二种同类表情，以此类推
            '图层/路径/1',//TODO
            '图层/路径/2',*/
        ]}
    ]},
    //说话状态
    speaking:{keywords:[],layerSettings:[
        {fileName:'kiritan.psd',layers:[
            '表情/目/8',
            '表情/口/6',
            '表情/眉/1',
            '体/1',
            '体/砲'
        ]}
    ]},
    //开心状态
    happy:{keywords:['嗯！','哈哈','是的','是呢','开心'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]},
    //感叹状态
    exclam:{keywords:['哦！','绝了','感叹'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]},
    //严肃或思考中的状态
    serious:{keywords:['什么','吗？','严肃','思考'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]},
    //悲伤、痛苦或哭泣状态
    sad:{keywords:['难受','不要','抱歉','唔唔','啊啊','悲伤','痛苦','哭泣'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]},
    //迷惑状态
    confused:{keywords:['嗯…','怎么','迷惑'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]},
    //尴尬状态
    embarrassed:{keywords:['原来','尬'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]},
    //挑逗或欲望状态
    joyful:{keywords:['让我','想要','你说','是不','挑逗','欲望'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]},
    //生气状态
    angry:{keywords:['哼！','滚啊','你马','生气'],layerSettings:[
        {fileName:'kiritan.psd',layers:[]}
    ]}
};

function speakVoice(str){
    if(str===''){
        return;
    }
    setTimeout(() => {
        finishSpeaking(characterInstance);
    }, str.length*250);
    /**@type {HTTP.RequestOptions}*/
    const option={
        hostname:'127.0.0.1',
        port:4532,
        path:'/talk',
        method:'POST'
    };
    const req=HTTP.request(option,/**@type {HTTP.IncomingMessage}*/res=>{
        res.setEncoding('utf8');
        let resBody='';
        if(res.statusCode===200){
            res.on('data',thunk=>resBody+=thunk);
            res.on('end',()=>{
                console.log(resBody);
            });
        }
    });
    req.on('error',e=>console.error('Error on talk, please check whether SimpleVoiceroid2Proxy is running properly:\n'+e));
    req.write(JSON.stringify({text:'東北きりたん(v1)＞'+str}));
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

const HTTP = require('http');

const expressionSettings={
    //通常状态
    normal:{keywords:[],layerSettings:[
        {fileName:'kurita.psd',layers:[//TODO:设定需要显示的图层
            '表情/目/5',
            '表情/口/5',
            '表情/眉/1',
            '体'
        /*]},{fileName:'kurita.psd',layers:[//TODO:第二种同类表情，以此类推
            '图层/路径/1',//TODO
            '图层/路径/2',*/
        ]}
    ]},
    //说话状态
    speaking:{keywords:[],layerSettings:[
        {fileName:'kurita.psd',layers:[
            '表情/目/5',
            '表情/口/1',
            '表情/眉/1',
            '体'
        ]}
    ]},
    //开心状态
    happy:{keywords:['嗯！','哈哈','是的','是呢','开心'],layerSettings:[
        {fileName:'kurita.psd',layers:[]}
    ]},
    //感叹状态
    exclam:{keywords:['哦！','绝了','感叹'],layerSettings:[
        {fileName:'kurita.psd',layers:[]}
    ]},
    //严肃或思考中的状态
    serious:{keywords:['什么','吗？','严肃','思考'],layerSettings:[
        {fileName:'kurita.psd',layers:[]}
    ]},
    //悲伤、痛苦或哭泣状态
    sad:{keywords:['难受','不要','抱歉','唔唔','啊啊','悲伤','痛苦','哭泣'],layerSettings:[
        {fileName:'kurita.psd',layers:[]}
    ]},
    //迷惑状态
    confused:{keywords:['嗯…','怎么','迷惑'],layerSettings:[
        {fileName:'kurita.psd',layers:[]}
    ]},
    //尴尬状态
    embarrassed:{keywords:['原来','尬'],layerSettings:[
        {fileName:'kurita.psd',layers:[
            'その他/頬線',
            'その他/頬',
            '表情/目/9',
            '表情/口/2',
            '表情/眉/1',
            '体'
        ]}
    ]},
    //挑逗或欲望状态
    joyful:{keywords:['让我','想要','你说','是不','挑逗','欲望'],layerSettings:[
        {fileName:'kurita.psd',layers:[]}
    ]},
    //生气状态
    angry:{keywords:['哼！','滚啊','你马','生气'],layerSettings:[
        {fileName:'kurita.psd',layers:[]}
    ]}
};

function speakVoice(str){
    if(str===''){
        return;
    }
    console.error('NOT IMPLEMENTED.');
}

let characterInstance,sendAudioData,startSpeaking,finishSpeaking;

module.exports=function(_characterInstance,_exposedFunctions){
    characterInstance=_characterInstance;
    sendAudioData=_exposedFunctions.sendAudioData;
    startSpeaking=_exposedFunctions.startSpeaking;
    finishSpeaking=_exposedFunctions.finishSpeaking;
    return {expressionSettings,speakVoice};
};

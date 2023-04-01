const child_process = require('child_process');

const expressionSettings={
    //通常状态
    normal:{keywords:[],layerSettings:[
        {fileName:'aoi.psd',layers:[//TODO:设定需要显示的图层
            '表情/目/12',
            '表情/口/14',
            '表情/眉/1',
            '葵体/葵体',
            '葵体/葵髪留1'
                /*]},{fileName:'aoi.psd',layers:[//TODO:第二种同类表情，以此类推
            '图层/路径/1',//TODO
            '图层/路径/2',*/
        ]}
    ]},
    //说话状态
    speaking:{keywords:[],layerSettings:[
        {fileName:'aoi.psd',layers:[
            '表情/目/6',
            '表情/口/1',
            '表情/眉/1',
            '葵体/葵体',
            '葵体/葵髪留1'
        ]}
    ]},
    //开心状态
    happy:{keywords:['嗯！','哈哈','是的','是呢','开心'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]},
    //感叹状态
    exclam:{keywords:['哦！','绝了','感叹'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]},
    //严肃或思考中的状态
    serious:{keywords:['什么','吗？','严肃','思考'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]},
    //悲伤、痛苦或哭泣状态
    sad:{keywords:['难受','不要','抱歉','唔唔','啊啊','悲伤','痛苦','哭泣'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]},
    //迷惑状态
    confused:{keywords:['嗯…','怎么','迷惑'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]},
    //尴尬状态
    embarrassed:{keywords:['原来','尬'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]},
    //挑逗或欲望状态
    joyful:{keywords:['让我','想要','你说','是不','挑逗','欲望'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]},
    //生气状态
    angry:{keywords:['哼！','滚啊','你马','生气'],layerSettings:[
        {fileName:'aoi.psd',layers:[]}
    ]}
};

//粗略判断字符串的语言
//返回值：0=日语 1=汉语 2=英语
function checkLanguage(/**@type {string}*/str){
    for(var i=0;i<str.length;i++){
        var c=str.charCodeAt(i);
        if(c>=0x3041&&c<=0x3096||c>=0x30A0&&c<=0x30FF||c>=0xFF66&&c<=0xFF9D){
            //检测到假名[U+3041,U+3096]OR[U+30A0,U+30FF]OR[U+FF66,U+FF9D]则是日语
            return 0;
        }
    }
    for(var i=0;i<str.length;i++){
        if(str.charCodeAt(i)>0x024F){
            //检测到字母以外的字符(U+024F,]是汉语
            return 1;
        }
    }
    //检测到只有字母符号是英语[U+0,U+024F]
    return 2;
}

function speakVoice(str){
    if(str===''){
        return;
    }
    var characterNames=['琴葉 葵','琴葉 葵（Chinese）','Kotonoha Aoi (English)'];
    var cmd='powershell -c "if((Get-ExecutionPolicy ) -ne \'AllSigned\'){Set-ExecutionPolicy -Scope Process Bypass};'+
    '$t=New-Object -ComObject Ai.Talk.Editor.Api.TtsControl;'+
    '$h=$t.GetAvailableHostNames();'+
    'if($h.length -eq 0){echo(\'错误：未安装A.I.VOICE Editor.\');exit;}'+
    'if(!$t.IsInitialized){$t.Initialize($h[0]);}'+
    'if($t.Status -eq \'NotRunning\'){$t.StartHost();}'+
    '$t.Connect();'+
    '$v=$t.VoiceNames;'+
    'while($t.Status -eq \'Busy\'){$t.Stop();}'+
    '$t.CurrentVoicePresetName=\''+characterNames[checkLanguage(str)]+'\';'+
    '$t.Text=\''+str+'\';'+
    '$t.Play();'+
    'while($t.Status -eq \'Busy\'){Start-Sleep -Seconds 1;}'+
    '$t.Disconnect();';
    child_process.exec(cmd,(error,stdout,stdin)=>{
        finishSpeaking(characterInstance);
        console.log('child_process exec:',error,stdout,stdin)
    });
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

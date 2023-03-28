const { readFileSync } = require('fs');
const HTTP = require('http');
const { hostname } = require('os');

let server=null;

/**
 * 启动HTTP服务器
 */
function startServer(){
    server=HTTP.createServer((request,response)=>{
        if(request.method==="POST"&&request.url==="/action"){
            response.setHeader('Content-Type','text/plain; charset=utf-8');
            const postdata=[];
            request.on('data',chunk=>{
                postdata.push(...chunk);
            });
            request.on('end',()=>{
                try{
                    let jsondata=JSON.parse(new TextDecoder().decode(new Uint8Array(postdata)));
                    response.statusCode=200;
                    response.end("您请求的数据为：\n"+JSON.stringify(jsondata));
                    try{
                        processRequest(jsondata.character,jsondata.sender,jsondata.subtitle,jsondata.voice);
                    }catch(e){
                        console.error('Error: '+e);
                        debugger;
                    }
                }catch(e){
                    response.statusCode=400;
                    response.end("您发送的数据有误：\n"+e);
                }
            });
        }else if(request.method==="GET"&&request.headers['user-agent'].search('curl')===-1){
            if(request.url==='/favicon.ico'){
                response.setHeader('Content-Type','image/x-icon');
                response.statusCode=200;
                response.end(readFileSync('app.ico'));
            }else if(request.url==='/'){
                response.setHeader('Content-Type','text/html; charset=utf-8');
                response.statusCode=200;
                response.end(readFileSync('webIndex.htm'));
            }else{
                response.setHeader('Content-Type','text/plain; charset=utf-8');
                response.statusCode=404;
                response.end('Cannot find: '+request.url);
            }
        }else{
            response.statusCode=405;
            response.end('不支持的方法。\n使用方法：\nPOST /action\n{\n\t"character":角色编号（设为-1为不指定具体角色）,'+
            '\n\t"sender":发送者编号,\n\t"subtitle":"显示内容",\n\t"voice":"朗读内容"\n}\n'+
            '注意：所有属性均不能缺省或设为null.');
        }
    });

    server.listen(global.mascotData.port,()=>{
        console.log(`The server is running on http://${hostname}:${global.mascotData.port}/`);
    });
}

var requestRecords=[];//[{sender:###(id),character:###(index)}]
//这是反向查询的
function findSenderIndexReverse(_sender){
    for(var i=requestRecords.length-1;i>=0;i--){
        if(requestRecords[i].sender===_sender){
            return i;
        }
    }
    return -1;
}
//找空闲已显示且最久没说话的characterIndex
function findIdleLeastSpeakCharacter(){
    var displayedCharacter=[],silentCount=[];
    //i即为seat索引
    for(var i=0;i<global.mascotData.seats.length;i++){
        var characterIndex=global.mascotData.seats[i].character;
        if(characterIndex>=0&&!global.seatWindows[i].seatCharacter.isSpeaking()){
            displayedCharacter.push(characterIndex);
            silentCount.push(0);
        }
    }
    for(var i=requestRecords.length-1;i>=0;i--){
        var index=displayedCharacter.findIndex(e=>e===requestRecords[i].character);
        if(index==-1){
            silentCount[index]++;
        }
    }
    var leastSpeakIndex=0;
    for(var i=0;i<silentCount.length;i++){
        if(silentCount[i]>silentCount[leastSpeakIndex]){
            leastSpeakIndex=i;
        }
    }
    return displayedCharacter[leastSpeakIndex];
}

//_character:若未指定则将它设为-1（必须的）
function processRequest(_character,_sender,_subtitle,_voice){
    let seatIndex;
    if(typeof(_character)==='string'){
        _character=global.findCharacterIndexByName(_character);
    }
    if(_character>=0){//若已指定
        seatIndex=global.findSeatIndexByCharacterIndex(_character);
        if(seatIndex===-1){
            seatIndex=findIdleLeastSpeakCharacter();
            global.seatChangeCharacter(seatIndex,_character);
            global.saveMascotData();
        }
    }else{//若未指定
        var senderIndex=findSenderIndexReverse(_sender);
        var ok=false;
        if(senderIndex>=0){
            _character=requestRecords[senderIndex].character;
            seatIndex=global.findSeatIndexByCharacterIndex(_character);
            if(seatIndex>=0&&!global.seatWindows[seatIndex].seatCharacter.isSpeaking()){
                ok=true;
            }
        }
        if(!ok){
            seatIndex=findIdleLeastSpeakCharacter();
            _character=global.mascotData.seats[seatIndex].character;
        }
    }
    global.seatWindows[seatIndex].seatCharacter.queueSpeak(_voice,_subtitle);
    //记录的数据任何属性都不能为null或undefined！！
    requestRecords.push({sender:_sender,character:_character});
    while(requestRecords.length>global.mascotData.maxMsgRecordsNum){
        requestRecords.shift();
    }
}

/**
 * 检测服务器运行状态
 * @returns 返回服务器是否正在运行
 */
function isServerRunning(){
    return server!==null&&server.listening;
}

/**
 * 停止服务器
 */
function endServer(){
    server.closeAllConnections();
    server=null;
}

module.exports={
    startServer,
    endServer,
    isServerRunning
};

const HTTP = require('http');
const { hostname } = require('os');

let server=null;

/**
 * 启动HTTP服务器
 */
function startServer(){
    server=HTTP.createServer((request,response)=>{
        response.setHeader('Content-Type','text/plain; charset=utf-8');
        if(request.method==="POST"&&request.url==="/action"){
            const postdata=[];
            request.on('data',chunk=>{
                postdata.push(...chunk);
            });
            request.on('end',()=>{
                try{
                    let jsondata=JSON.parse(new TextDecoder().decode(new Uint8Array(postdata)));
                    response.statusCode=200;
                    response.end("您请求的数据为：\n"+JSON.stringify(jsondata));
                    processRequest(jsondata.character,jsondata.sender,jsondata.subtitle,jsondata.voice);
                }catch(e){
                    response.statusCode=400;
                    response.end("您发送的数据有误：\n"+e);
                }
            });
        }else{
            response.statusCode=405;
            response.end('不支持的方法。\n使用方法：\nPOST /action\n{\n\t"character":角色编号,'+
            '\n\t"seat":位置编号,\n\t"sender":发送者编号,\n\t"subtitle":"显示内容",\n\t"voice":"朗读内容"\n}');
        }
    });

    server.listen(global.mascotData.port,()=>{
        console.log(`The server is running on http://${hostname}:${global.mascotData.port}/`);
    });
}

var requestRecords=[];//[{sender:###,character:###}]

function processRequest(_character,_sender,_subtitle,_voice){
    //TODO
    console.log("TODO:Request");
    requestRecords.push({sender:_sender,character:_character});
    while(requestRecords.length>global.mascotData.maxMsgRecordsNum){
        requestRecords.shift();
    }
    console.debug("Now:"+requestRecords.length);
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

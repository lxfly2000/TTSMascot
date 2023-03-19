const HTTP = require('http');
const { hostname } = require('os');

const port=20042;

const server=HTTP.createServer((request,response)=>{
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

server.listen(port,()=>{
    console.log(`The server is running on http://${hostname}:${port}/`);
});

const maxRecordsNum=10;
var requestRecords=[];//[{sender:###,character:###}]

function processRequest(_character,_sender,_subtitle,_voice){
    console.log("TODO:Request");
    requestRecords.push({sender:_sender,character:_character});
    if(requestRecords.length>maxRecordsNum){
        requestRecords.shift();
    }
}
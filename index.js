function NewWindow(){
    window.open("suba.html");
}

window.onload=function(){
    testLoadPSD();
};

function setLayerVisible(psdfile,layerpath,visible){
    //todo
}

const toBase64 = function(image) {
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

function testLoadPSD(){
    const PSD = require('psd');
    var psdpath='ずんだもん立ち絵素材改1.0/ずんだもん立ち絵素材改.psd';
    var psdfile=PSD.fromFile(psdpath);
    if(psdfile.parse()){
        var png=psdfile.image.toPng();
        toBase64(png).then(content=>{
            img1.src=content;
            psdinfo.innerText=psdpath;
        });
    }
}

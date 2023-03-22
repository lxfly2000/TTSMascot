const PSD = require('psd');
const {screen} = require('electron');

class Character{
    constructor(bw,_seatIndex){
        this.usingWindow=bw;
        this.seatIndex=_seatIndex;
    }
    
    loadCharacter(){
        let screenSize=screen.getPrimaryDisplay().workAreaSize;
        var psdpath=__dirname+'/ずんだもん立ち絵素材改.psd';
        var psdfile=PSD.fromFile(psdpath);
        let s=global.mascotData.seats[this.seatIndex];
        let c=global.mascotData.characters[s.character];
        if(psdfile.parse()){
            let setData={
                url:undefined,
                width:c.definedWidthPx*c.zoom,
                height:c.definedHeightPx*c.zoom
            };
            let psdinfo=psdfile.tree().export();
            if(setData.width===0){
                setData.width=psdinfo.document.width*setData.height/psdinfo.document.height;
            }else if(setData.height===0){
                setData.height=psdinfo.document.height*setData.width/psdinfo.document.width;
            }
            this.usingWindow.setBounds({
                x:Math.floor(screenSize.width*s.xPercent-Math.ceil(setData.width/2)),
                y:Math.floor(screenSize.height*s.yPercent-Math.ceil(setData.height/2)),
                width:Math.ceil(setData.width),
                height:Math.ceil(setData.height)
            });
            var png=psdfile.image.toPng();
            toBase64(png).then(contentBase64String=>{
                setData.url=contentBase64String;
                this.usingWindow.webContents.send('setCharacter',setData);
            });
        }
    }
}

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

module.exports=Character;

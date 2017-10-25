const os = require('os');

exports.getLocalIp = function () {
    const network = os.networkInterfaces()
    for (let key in network){
        if (network.hasOwnProperty(key)) {
            const details = network[key];
            if (details && details.length) {
                for (let i = 0, len = details.length; i < len; i++){
                    const ip = String(details[i].address).trim();
                    if(ip && /^\d+(?:\.\d+){3}$/.test(ip) && ip !== '127.0.0.1'){
                        return ip;
                    }
                }
            }
        }
    }
}

exports.readAsBase64 = function (file, callback) {
    const reader = new FileReader();
    reader.onload = function(){
        callback(this.result);
    }
    reader.readAsDataURL(file);
}

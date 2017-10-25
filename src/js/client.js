const net = require('net');
const os = require('os');
const utils = require('./utils');

class SocketWrap {
    constructor(socket) {
        this.socket = socket;
        this.buffer = null;
        this.status = 0;
    }
    on(type, callback) {
        if (type === 'data') {
            this.socket.on('data', (data) => {
                if (this.status === 0) {
                    if (data.indexOf(SocketWrap.DataStartFlag) !== -1) {
                        this.buffer = data.slice(SocketWrap.DataStartFlag.length);
                        this.status = 1;
                    }
                } else if (this.status === 1) {
                    this.buffer = Buffer.concat([this.buffer, data]);
                }
                const last = this.buffer.lastIndexOf(SocketWrap.DataEndFlag);
                if (last !== -1) {
                    callback(this.buffer.slice(0, last));
                    this.buffer = null;
                    this.status = 0;
                }
            });
        } else {
            this.socket.on(type, callback);
        }
    }
    write(data, encoding) {
        this.socket.write(Buffer.concat([SocketWrap.DataStartFlag, Buffer.from(data, encoding), SocketWrap.DataEndFlag]));
    }
    end(data, encoding) {
        this.write(data, encoding);
        this.socket.end();
    }
}
SocketWrap.DataStartFlag = Buffer.from('>>>start<<<', 'utf8');
SocketWrap.DataEndFlag = Buffer.from('>>>end<<<', 'utf8');

class Client {
    constructor() {
        this.ip = utils.getLocalIp();
        this.tag = '';
        this.server = null;
        this.port = null;
        this.name = '';
        this.icon = '';
        this.targets = {};
        this.methods = {};
    }
    connect(ip, port) {
        const tag = ip + ':' + port;
        const socket = new SocketWrap(net.connect(port, ip));
        const target = new Target(tag, socket);
        this.targets[tag] = target;
        socket.on('connect', () => {
            this.targets[tag] = target;
            socket.write(JSON.stringify({type: 'start', tag: this.tag, name: this.name, icon: this.icon}), 'utf8');
        });
        socket.on('data', (data) => {
            this.handler(tag, JSON.parse(data.toString('utf8')));
        });
    }
    setAccount(name, icon) {
        this.name = name;
        this.icon = icon;
    }
    init(name, icon) {
        this.server = net.createServer();
        this.server.on('connection', (socket) => { 
            socket = new SocketWrap(socket);
            socket.write(JSON.stringify({type: 'start', name: this.name, icon: this.icon}), 'utf8');
            let tag;
            socket.on('data', (data) => {
                data = JSON.parse(data.toString('utf8'));
                if (data.type == 'start' && data.tag) {
                    tag = data.tag;
                    this.targets[tag] = new Target(tag, socket);
                }
                this.handler(tag, data);
            });
        });
        this.server.listen();
        return new Promise((resolve, reject) => {
            this.server.on('listening', () => {
                this.port = this.server.address().port;
                this.tag = this.ip + ':' + this.port;
                resolve(this.tag);
            });
        });
    }
    on(type, handler) {
        this.methods[type] = handler;
    }
    handler(tag, data) {
        const fn = this.methods[data.type];
        fn && fn(tag, data);
    }
}

class Target {
    constructor(tag, socket) {
        this.socket = socket;
        this.tag = tag;
    }
    close() {
        this.socket.end(JSON.stringify({type: 'close'}), 'utf8');
    }
    sendMessage(data) {
        this.socket.write(JSON.stringify({type: 'message', data: data}), 'utf8');
    }
}

exports.Client = Client;
exports.Target = Target;

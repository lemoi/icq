const addContact= document.getElementById('add-contact');
const localTag= document.getElementById('local-tag');
const contactPlaceholder = document.querySelector('.layout-left');
const recordPlaceholder = document.querySelector('.layout-right');
const accountName = document.querySelector('.name');
const accountProfile = document.querySelector('.account-icon');
const config = document.querySelector('.config');
const configuriation = document.querySelector('.configuriation');
const configName = document.querySelector('.config-name');
const configProfile = document.querySelector('.config-profile');
const configConfirm = document.querySelector('.config-confirm');
const configClose = document.querySelector('.configuriation > .close');
const utils = require('./js/utils');

const RecordList = {};

class Record {
    constructor(tag, icon) {
        this.tag = tag;
        this.messageList = null;
        this.root = null;
        this.text = null;
        this.visibility = false;
        RecordList[tag] = this;
    }
    render(parent, name, icon) {
        const root = document.createElement('div');
        const info = document.createElement('div');
        const messageList = document.createElement('div');
        const input = document.createElement('div');
        root.className = 'record';
        root.style.display = 'none';
        info.className = 'contact-info';
        messageList.className = 'message-record';
        input.className = 'input-area';
        this.messageList = messageList;
        root.appendChild(info);
        root.appendChild(messageList);
        root.appendChild(input);

        info.innerHTML = 
        `   <div>${name}</div>
            <div>${this.tag}</div>
        `;

        const tool = document.createElement('div');
        tool.className = 'tool-bar';
        const box = document.createElement('div');
        box.className = 'input-box';
        const text = document.createElement('textarea');
        this.text = text;
        text.onkeydown = this.sendMessage.bind(this);
        box.appendChild(text);
        input.appendChild(tool);
        input.appendChild(box);

        this.root = root;
        parent.appendChild(root);
    }
    sendMessage(event) {
        if (event.keyCode == 13) {
            const data = this.text.value;
            client.targets[this.tag].sendMessage(data);
            this.addMessgae(client.icon, data, true);
            this.text.value = '';
        }
    }
    addMessgae(icon, data, mine) {
        const message = document.createElement('div');
        message.classList.add('message');
        if (mine) {
            message.classList.add('mine');
        } else {
            message.classList.add('others');
        }
        message.innerHTML =
        `   <div class="message-icon" style="background-image: url('${icon}')"></div>
            <div class="message-data">${data}</div>   
        `;
        this.messageList.appendChild(message);
    }
    close() {
        this.root.parentNode.removeChild(this.root);
        delete RecordList[this.tag];
    }
    active() {
        if (this.visibility == true) {
            return;
        }
        for (let tag in RecordList) {
            if (tag == this.tag) {
                continue;
            }
            RecordList[tag].sleep();
        }
        this.visibility = true;
        this.root.style.display = 'flex';
    }
    sleep() {
        this.visibility = false;
        this.root.style.display = 'none';
    }
}

const ContactList = {};

class Contact {
    constructor(tag, name, icon) {
        this.tag = tag;
        this.name = name;
        this.icon = icon;
        this.lastMessage = null;
        this.root = null;
        this.record = new Record(tag);;
        this.record.render(recordPlaceholder, client.name, client.icon);
        ContactList[tag] = this;
    }
    render(parent) {
        const root = document.createElement('div');
        const close = document.createElement('div');
        const imgWrap = document.createElement('div');
        const info = document.createElement('div');
        const name = document.createElement('span');
        const lastMessage = document.createElement('span');
        root.className = 'contact';
        root.onclick = this.openRecord.bind(this);
        close.className = 'close';
        close.onclick = this.close.bind(this);
        imgWrap.className = 'img-wrap';
        imgWrap.style.backgroundImage = 'url("' + this.icon + '")';
        name.className = 'contact-name';
        name.textContent = this.name;
        lastMessage.className = 'contact-last-message';
        this.lastMessage = lastMessage;
        root.appendChild(close);
        root.appendChild(imgWrap);
        root.appendChild(info);
        info.appendChild(name);
        info.appendChild(document.createElement('br'));
        info.appendChild(lastMessage);
        parent.appendChild(root);
        this.root = root;
    }
    close(event) {
        this.root.parentNode.removeChild(this.root);
        this.record.close();
        if (event) {
            client.targets[this.tag].close();
            event.stopPropagation();
        }
        delete RecordList[this.tag];
        delete client.targets[this.tag];
    }
    openRecord() {
        this.root.classList.add('active');
        this.record.active();
    }
    newMessage(data) {
        this.lastMessage.textContent = data;
        this.record.addMessgae(this.icon, data, false);
    }
}

const client = new (require('./js/client').Client)();

let local;

const account = require('./account.json');

function initAccount(name, icon) {
    accountProfile.style.backgroundImage = 'url("' + icon + '")';
    accountName.textContent = name;
    client.setAccount(name, icon);
}

function collectConfig() {
    account.name = configName.value;
    configProfile.textContent = '选取头像';
    configProfile.classList.remove('selected');
    configName.value = '';
    require('fs').writeFileSync(require('path').join(__dirname, './account.json'), JSON.stringify(account));
    initAccount(account.name, account.profile);
    closeConfig();
}

function closeConfig() {
    configuriation.style.display = 'none';
}

function openConfig() {
    configuriation.style.display = 'block';
}

initAccount(account.name, account.profile)
client.init().then((tag) => {
    local = tag;
    localTag.textContent = tag;
});

addContact.onkeydown = (event) => {
    if (event.keyCode == 13) {
        const tag = addContact.value;
        const address = tag.split(':');
        client.connect(address[0], address[1]);
    }
}

config.onclick = openConfig;
configClose.onclick = closeConfig;
configConfirm.onclick = collectConfig;

configProfile.onclick = () => {
    const input = document.createElement('input');
    input.type = "file";
    input.accept = "image/png,image/jpeg",
    input.click();
    input.onchange = () => {
        utils.readAsBase64(input.files[0], (file) => {
            account.profile = file;
            configProfile.textContent = '已选择';
            configProfile.classList.add('selected');
        });
    }
}

client.on('start', (tag, data) => {
    (new Contact(tag, data.name, data.icon)).render(contactPlaceholder);
});

client.on('close', (tag, data) => {
    ContactList[tag].close();
});

client.on('message', (tag, data) => {
    ContactList[tag].newMessage(data.data);
});

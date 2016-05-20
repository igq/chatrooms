var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

// <启动Socket.IO服务器
exports.listen = function (server){
    // 在现有的HTTP服务上启动SocketIO服务器
    io = socketio.listen(server);
    io.set('log level', 1);
    // 用户连接时业务实现
    io.sockets.on('connection',function(socket){
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        // 用户连接时进入聊天室（Lobby）
        joinRoom(socket, 'Lobby');
        // handleMessageBroadcasting(socket, nickNames);
        // handleNameChangeAttempts(socket, nickNames, namesUsed);
        // handleRoomJoining(socket);
        socket.on('rooms', function(){
            socket.emit('rooms', io.sockets.manager.rooms);
        } );
        // handleClientDisconnection(socket, nickNames, namesUsed);  
    });
}
// 启动Socket.IO服务器>

// 分配游客昵称
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    // 生成游客昵称
    var name = 'Guest' + guestNumber;
    // 关联socketid
    nickNames[socket.id] = name;
    // ? 让用户知道他们的昵称
    socket.emit('nameResult',{
        success: true,
        name: name
    });
    // 存放已被占用的昵称
    namesUsed.push(name);
    return guestNumber + 1;
}

// 进入聊天室
function joinRoom(socket, room){
    // 用户进入房间
    socket.join(room);
    // 记录用户当前房间
    currentRoom[socket.id] = room;
    // ? 让用户知道他们进入了新的房间
    socket.emit('joinResult', {room: room});
    // 让房间其他用户知道有新用户加入房间
    socket.broadcast.to(room).emit(
        'message', 
        {
            text: nickNames[socket.id] + ' has joined ' + room + '.'
        }
    );
    // 获取房间所有用户
    var usersInRoom = io.sockets.clients(room);
    // 如果房间有多个用户，显示所有用户列表
    if (usersInRoom.length > 1){
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            // 不显示自己的名字
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        // 房间其他用户发送给这个房间
        socket.emit('message', {text: usersInRoomSummary});
    }
}
var socketio = require('socket.io')
var io
var guestNumber = 1
var nickNames = {}
var namesUsed = []
var currentRoom = {}
var diceMax = 100
var Constants = function () {
  var constants = {
    GUEST_NAME: 'Guest',
    ROOM_NAME: 'Lobby'
  }
  this.get = function (constantName) {
    return constants[constantName]
  }
}
var constants = new Constants()

// <启动Socket.IO服务器
exports.listen = function (server) {
    // 在现有的HTTP服务上启动SocketIO服务器
  io = socketio.listen(server)
  io.set('log level', 1)
    // 用户连接时业务实现
  io.sockets.on('connection', function (socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed)
        // 用户连接时进入聊天室（Lobby）
    joinRoom(socket, constants.get('ROOM_NAME'))
    handleMessageBroadcasting(socket, nickNames)
    handleNameChangeAttempts(socket, nickNames, namesUsed)
    handleRoomJoining(socket)
    handleDice(socket, diceMax)
        // 用户发出请求时，返回聊天室列表
    socket.on('rooms', function () {
      socket.emit('rooms', io.sockets.manager.rooms)
    })
    handleClientDisconnection(socket, nickNames, namesUsed)
  })
}
// 启动Socket.IO服务器>

/** 分配游客昵称 */
function assignGuestName (socket, guestNumber, nickNames, namesUsed) {
    // 生成游客昵称
  var name = constants.get('GUEST_NAME') + guestNumber
    // 关联socketid
  nickNames[socket.id] = name
    // ? 让用户知道他们的昵称
  socket.emit('nameResult', {
    success: true,
    name: name
  })
    // 存放已被占用的昵称
  namesUsed.push(name)
  return guestNumber + 1
}

/** 进入聊天室 */
function joinRoom (socket, room) {
    // 用户进入房间
  socket.join(room)
    // 记录用户当前房间
  currentRoom[socket.id] = room
    // ? 让用户知道他们进入了新的房间
  socket.emit('joinResult', {room: room})
    // 让房间其他用户知道有新用户加入房间
  socket.broadcast.to(room).emit(
        'message',
    {
      text: nickNames[socket.id] + ' has joined ' + room + '.'
    }
    )
    // ? 获取房间所有用户
  var usersInRoom = io.sockets.clients(room)
    // 如果房间有多个用户，显示所有用户列表
  if (usersInRoom.length > 1) {
    var usersInRoomSummary = 'Users currently in ' + room + ': '
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id
            // 不显示自己的名字
      if (userSocketId !== socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', '
        }
        usersInRoomSummary += nickNames[userSocketId]
      }
    }
    usersInRoomSummary += '.'
        // 发送用户列表
    socket.emit('message', {text: usersInRoomSummary})
  }
}

/** 修改昵称 */
function handleNameChangeAttempts (socket, nickNames, namesUsed) {
    // nameAttempt事件监听器
  socket.on('nameAttempt', function (name) {
    if (name.indexOf(constants.get('GUEST_NAME')) === 0) {
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with ' + constants.get('GUEST_NAME') + '.'
      })
    } else {
            // 如果昵称未注册就注册上
      if (namesUsed.indexOf(name) === -1) {
        var previousName = nickNames[socket.id]
        var previousNameIndex = namesUsed.indexOf(previousName)
        namesUsed.push(name)
        nickNames[socket.id] = name
                // 删除修改前的用户昵称
        delete namesUsed[previousNameIndex]
        socket.emit('nameResult', {
          success: true,
          name: name
        })
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        })
      } else {
                // 如果昵称已注册则返回错误信息
        socket.emit('nameResult', {
          success: false,
          message: 'That name is already in use.'
        })
      }
    }
  })
}

/** 发送聊天消息 */
function handleMessageBroadcasting (socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    })
  })
}

// 加入新的已有房间，如果没有则创建一个新房间
function handleRoomJoining (socket) {
  socket.on('join', function (room) {
    socket.leave(currentRoom[socket.id])
    joinRoom(socket, room.newRoom)
  })
}

/** 断开连接 */
function handleClientDisconnection (socket) {
  socket.on('disconnect', function () {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id])
        /* 通知其他用户下线消息
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
           text:nickNames[socket.id] + ' is offline.'
        });
        */
    delete namesUsed[nameIndex]
    delete nickNames[socket.id]
    delete currentRoom[socket.id]
        // delete 操作符用来删除一个对象的属性，或数组元素。 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/delete
  })
}

function handleDice (socket) {
  socket.on('dice', function (max) {
    var maxNum = isNaN(parseInt(max)) ? 100 : parseInt(max)
    var diceNum = Math.ceil(Math.random() * maxNum)
        // 通知发送者
    socket.emit('message', {text: 'You diced ' + diceNum + ' of ' + maxNum})
        // 通知其他用户
    socket.broadcast.to(currentRoom[socket.id]).emit('message', {
      text: nickNames[socket.id] + ' diced ' + diceNum + ' of ' + maxNum
    })
  })
}

var Chat = function(socket) {
  this.socket = socket;
};

Chat.prototype.sendMessage = function(room, text) {
  var message = {
    room: room,
    text: text
  };
  this.socket.emit('message', message);
};

Chat.prototype.changeRoom = function(room) {
  this.socket.emit('join', {
    newRoom: room
  });
};

Chat.prototype.processCommand = function(command) {
  var words = command.split(' ');
  var command = words[0]
                .substring(1, words[0].length)
                .toLowerCase();
  var message = false;

  switch(command) {
    case 'join':
      words.shift();
      var room = words.join(' ');
      this.changeRoom(room);
      break;
    case 'nick':
      words.shift();
      var name = words.join(' ');
      this.socket.emit('nameAttempt', name);
      break;
    case 'dice':
      words.shift();
      var max = words.join('');
      // 使用socketio发送消息
      this.socket.emit('dice', max);
      // 不使用socketio发送消息
      // var msg = {name: "dice", args: [max]};
      // var msgStr = JSON.stringify(msg);
      // this.socket.send(msgStr);
      break;
    default:
      message = 'Unrecognized command.';
      break;
  };

  return message;
};

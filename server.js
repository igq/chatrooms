var http = require('http')
var fs = require('fs')
var path = require('path')
var mime = require('mime')
var cache = {}

// <静态文件服务
/**
 *  找不到文件返回信息
 */
function send404 (response) {
  response.writeHead(404, {'Content-Type': 'text/plain'})
  response.write('Error 404: resource not found.')
  response.end()
}

/**
 *  发送文件
 */
function sendFile (response, filePath, fileContents) {
  response.writeHead(200,
        {'Content-Type': mime.lookup(path.basename(filePath))}
    )
  response.end(fileContents)
}

/**
 * 静态文件服务
 */
function serveStatic (response, cache, absPath) {
    // 缓存中存在则返回内存中的文件
  if (cache[absPath]) {
    sendFile(response, absPath, cache[absPath])
  } else {
    fs.readFile(absPath, function (err, data) {
      if (err) {
        send404(response)
      } else {
        cache[absPath] = data
        sendFile(response, absPath, data)
      }
    })
  }
}
// 静态文件服务>

// <创建HTTP服务器
var server = http.createServer(function (request, response) {
  var filePath = false
  if (request.url === '/') {
        // 无文件名，默认返回index.html
    filePath = 'public/index.html'
  } else {
        // URL路径转为静态文件相对路径
    filePath = 'public' + request.url
  }
  var absPath = './' + filePath
    // 返回静态文件
  serveStatic(response, cache, absPath)
})
server.listen(3000, function () {
  console.log('Server listening on port 3000')
})
// 创建HTTP服务器>

// <创建WebSocket服务器
var chatServer = require('./lib/chat_server')
chatServer.listen(server)
// 创建WebSocket服务器>

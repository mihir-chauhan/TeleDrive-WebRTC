const HTTPS_PORT = 443; //default port for https is 443
const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');

// based on examples at https://www.npmjs.com/package/ws 
const WebSocketServer = WebSocket.Server;

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync('../key.pem'),
  cert: fs.readFileSync('../cert.pem'),
};

// ----------------------------------------------------------------------------------------

// Create a server for the client html page
const handleRequest = function (request, response) {
  // Render the single client html file for any request the HTTP server receives

  if (request.url === '/webrtc.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' });
    response.end(fs.readFileSync('client/webrtc.js'));
  } else if (request.url === '/style.css') {
    response.writeHead(200, { 'Content-Type': 'text/css' });
    response.end(fs.readFileSync('client/style.css'));
  } else if (request.url === '/gamepadWorker.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' });
    response.end(fs.readFileSync('client/gamepadWorker.js'));
  } else {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(fs.readFileSync('client/index.html'));
  }
};

const httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT);

// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
const wss = new WebSocketServer({ server: httpsServer });

wss.on('connection', function (ws) {
  var isFirstMessageFromClient = true;
  ws.on('message', function (message) {
    console.log("msg: " + message);
    // Broadcast any received message to all clients
    if (isFirstMessageFromClient) {
      if (message.includes("4C4C4544-0032-3610-8044-B5C04F305932")) {
        isFirstMessageFromClient = false;
      } else {
        ws.close();
      }
    }
    if (message.includes("IP: ")) {
      message = message.replace('IP: ', '')
      if (ValidateIPaddress(message)) {
        console.log("Connecting to Robot at: " + message);
        //TODO: initialize robot UDP socket connection
      } else {
        console.log("The IP address for the robot '" + message + "' is not a valid address. Please reload the host page and try again.");
      }
    } else if (!message.includes("4C4C4544-0032-3610-8044-B5C04F305932")) {
      wss.broadcast(message);
    }
  });

  ws.on('error', () => ws.terminate());
});

wss.broadcast = function (data) {
  this.clients.forEach(function (client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
      // console.log('sent: %s', data);
    }
  });
};

console.log('Server running successfully.'
);

// ----------------------------------------------------------------------------------------

// Separate server to redirect from http to https
// http.createServer(function (req, res) {
//   console.log(req.headers['host'] + req.url);
//   res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
//   res.end();
// }).listen(HTTP_PORT);

function ValidateIPaddress(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
    return (true)
  }
  return (false)
}
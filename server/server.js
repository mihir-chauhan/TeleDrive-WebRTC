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

  // if (request.url === '/webrtc.js') {
  //   response.writeHead(200, { 'Content-Type': 'application/javascript' });
  //   response.end(fs.readFileSync('client/webrtc.js'));
  // } else if (request.url === '/style.css') {
  //   response.writeHead(200, { 'Content-Type': 'text/css' });
  //   response.end(fs.readFileSync('client/style.css'));
  // } else if (request.url === '/gamepadWorker.js') {
  //   response.writeHead(200, { 'Content-Type': 'application/javascript' });
  //   response.end(fs.readFileSync('client/gamepadWorker.js'));
  // } else {
  //   response.writeHead(200, { 'Content-Type': 'text/html' });
  //   response.end(fs.readFileSync('client/index.html'));
  // }
};

const httpsServer = https.createServer(serverConfig, handleRequest);
httpsServer.listen(HTTPS_PORT);

// ----------------------------------------------------------------------------------------

// Create a server for handling websocket calls
const wss = new WebSocketServer({ server: httpsServer });

wss.on('connection', function (ws, req) {
  var isFirstMessageFromClient = true;
  console.log("new connection");
  ws.on('message', function (message) {
    // Broadcast any received message to all clients
    if (isFirstMessageFromClient) {
      if (message.includes("4C4C4544-0032-3610-8044-B5C04F305932")) {
        isFirstMessageFromClient = false;
        let date_ob = new Date();
        const dateTime = date_ob.getFullYear() + "-" + ("0" + (date_ob.getMonth() + 1)).slice(-2) + "-" + ("0" + date_ob.getDate()).slice(-2) + " " + date_ob.getHours() + ":" + date_ob.getMinutes() + ":" + date_ob.getSeconds();
        const userName = message.replace('4C4C4544-0032-3610-8044-B5C04F305932-', '');
        const userDataJSON = { userName: userName, ipaddress: req.connection.remoteAddress, time: dateTime };
        fs.appendFile('TeleDrive_Data.txt', ", \n" + JSON.stringify(userDataJSON), function (err) {
          if (err) throw err;
          console.log('Saved: ' + JSON.stringify(userDataJSON));
        });

      } else {
        console.log("Incorrect Key Provided. Closing Connection");
        ws.terminate();
      }
    }
    if (!message.includes("4C4C4544-0032-3610-8044-B5C04F305932")) {
      wss.broadcast(message);
    }
  });

  ws.on('error', () => ws.close());
});

wss.broadcast = function (data) {
  this.clients.forEach(function (client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

console.log('Server running successfully.');

function ValidateIPaddress(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
    return (true)
  }
  return (false)
}
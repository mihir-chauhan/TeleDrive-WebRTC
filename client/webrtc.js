const WS_PORT = 11039; //make sure this matches the port for the webscokets server
const LH_WS_PORT = 9301; //make sure this matches the port for the webscokets server
const WS_ADDR = '192.168.1.30'; //make sure this matches the port for the webscokets server

var localUuid;
var localDisplayName;
var localStream;
var serverConnection;
var localHostConnection;
var peerConnections = {}; // key is uuid, values are peer connection object and user defined display name string

var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3942' },
    { 'urls': 'stun:stun.l.google.com:12084' },
  ]
};

var isDriver = false;
var roomName;
var robotIPaddress;

function start() {

  // check if "&displayName=xxx" is appended to URL, otherwise alert user to populate
  var urlParams = new URLSearchParams(window.location.search);
  localDisplayName = urlParams.get('displayName') || prompt('Enter your name', '');
  if (confirm('If you are the host, please click OK. Otherwise, click CANCEL.')) {
    roomName = prompt('Please enter a room name', '');
    robotIPaddress = prompt('Please enter your robot IP address as shown on the Driver Station', '');
  } else {
    roomName = prompt('Please enter the room name you want to join', '');
    localDisplayName = "Driver: ".concat(localDisplayName);
    isDriver = true;
    document.getElementById('localVideoContainer').style.display = "none";
  }

  localUuid = createUUID(isDriver);

  // specify no audio for user media
  var constraints = {
    video: {
      width: { max: 1920 },
      height: { max: 1080 },
      frameRate: { max: 60 },
    },
    audio: true,
  };

  if (isDriver) {
    constraints = {
      video: false,
      audio: true,
    };
  }

  // set up local video stream
  if (navigator.mediaDevices.getUserMedia) {
    // if(window.location.hostname == )
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        localStream = stream;
        if (!isDriver) {
          localHostConnection = new WebSocket('wss://localhost:' + LH_WS_PORT);
          localHostConnection.onopen = event => {
            if (!isDriver && robotIPaddress != null) {
              localHostConnection.send("IP: " + robotIPaddress);
            }
          }
          document.getElementById('localVideo').srcObject = stream;
        }
      }).catch(errorHandler)

      // set up websocket and message all existing clients
      .then(() => {
        serverConnection = new WebSocket('wss://' + WS_ADDR + ':' + WS_PORT);
        serverConnection.onmessage = gotMessageFromServer;
        serverConnection.onopen = event => {
          serverConnection.send(JSON.stringify({ 'displayName': localDisplayName, 'uuid': localUuid, 'dest': 'all' }));
          if (!isDriver && robotIPaddress != null) {
            serverConnection.send("IP: " + robotIPaddress);
          }
        }
      }).catch(errorHandler);

  } else {
    alert('Your browser does not support getUserMedia API');
  }
}


var A = false;
var B = false;
var X = false;
var Y = false;
var LB = false;
var RB = false;
var LT = false;
var RT = false;
var BACK = false;
var START = false;
var DU = false;
var DD = false;
var DL = false;
var DR = false;

var LX = 0.0;
var LY = 0.0;
var RX = 0.0;
var RY = 0.0;

var userNumber = 0;

function startGamepadHandlerAndSocketThread() {

  var haveEvents = 'GamepadEvent' in window;
  var haveWebkitEvents = 'WebKitGamepadEvent' in window;
  var controllers = {};
  var rAF = window.mozRequestAnimationFrame ||
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame;

  function connecthandler(e) {
    addgamepad(e.gamepad);
  }
  function addgamepad(gamepad) {
    controllers[gamepad.index] = gamepad;
    rAF(updateStatus);
  }

  function disconnecthandler(e) {
    removegamepad(e.gamepad);
  }

  function removegamepad(gamepad) {
    delete controllers[gamepad.index];
  }

  function updateStatus() {
    scangamepads();
    for (j in controllers) {
      var controller = controllers[j];

      for (var i = 0; i < controller.buttons.length; i++) { //a, b, x, y, left_bumper, right_bumper, left_trigger, right_trigger, back, start, ..., 12 - dpad_up, 13 - dpad_down, 14 - dpad_left, 15 - dpad_right
        var val = controller.buttons[i];
        var pressed = (controller.buttons[i] == 1.0);
        if (typeof (val) == "object") {
          pressed = val.pressed;
          val = val.value;
        }
        if (i == 0) {
          if (A != pressed) {
            A = pressed;
            datachannel.send("G" + userNumber + "_A_" + (A ? "P" : "R"));
          }
        } else if (i == 1) {
          if (B != pressed) {
            B = pressed;
            datachannel.send("G" + userNumber + "_B_" + (B ? "P" : "R"));
          }
        } else if (i == 2) {
          if (X != pressed) {
            X = pressed;
            datachannel.send("G" + userNumber + "_X_" + (X ? "P" : "R"));
          }
        } else if (i == 3) {
          if (Y != pressed) {
            Y = pressed;
            datachannel.send("G" + userNumber + "_Y_" + (Y ? "P" : "R"));
          }
        } else if (i == 4) {
          if (LB != pressed) {
            LB = pressed;
            datachannel.send("G" + userNumber + "_LB_" + (LB ? "P" : "R"));
          }
        } else if (i == 5) {
          if (RB != pressed) {
            RB = pressed;
            datachannel.send("G" + userNumber + "_RB_" + (RB ? "P" : "R"));
          }
        } else if (i == 6) {
          if (LT != pressed) {
            LT = pressed;
            datachannel.send("G" + userNumber + "_LT_" + (LT ? "P" : "R"));
          }
        } else if (i == 7) {
          if (RT != pressed) {
            RT = pressed;
            datachannel.send("G" + userNumber + "_RT_" + (RT ? "P" : "R"));
          }
        } else if (i == 8) {
          if (BACK != pressed) {
            BACK = pressed;
            datachannel.send("G" + userNumber + "_BACK_" + (BACK ? "P" : "R"));
          }
        } else if (i == 9) {
          if (START != pressed) {
            START = pressed;
            datachannel.send("G" + userNumber + "_START_" + (START ? "P" : "R"));
          }
        } else if (i == 12) {
          if (DU != pressed) {
            DU = pressed;
            datachannel.send("G" + userNumber + "_DU_" + (DU ? "P" : "R"));
          }
        } else if (i == 13) {
          if (DD != pressed) {
            DD = pressed;
            datachannel.send("G" + userNumber + "_DD_" + (DD ? "P" : "R"));
          }
        } else if (i == 14) {
          if (DL != pressed) {
            DL = pressed;
            datachannel.send("G" + userNumber + "_DL_" + (DL ? "P" : "R"));
          }
        } else if (i == 15) {
          if (DR != pressed) {
            DR = pressed;
            datachannel.send("G" + userNumber + "_DR_" + (DR ? "P" : "R"));
          }
        }
      }

      if (START && A) {
        userNumber = 1;
      } else if (START && B) {
        userNumber = 2;
      }

      for (var i = 0; i < controller.axes.length; i++) { // leftX, leftY, rightX, rightY
        if (i == 0) {
          if (LX != controller.axes[i]) {
            LX = controller.axes[i];
            datachannel.send("G" + userNumber + "_LX_" + (LX));
          }
        } else if (i == 1) {
          if (LY != controller.axes[i]) {
            LY = controller.axes[i];
            datachannel.send("G" + userNumber + "_LY_" + (LY));
          }
        } else if (i == 2) {
          if (RX != controller.axes[i]) {
            RX = controller.axes[i];
            datachannel.send("G" + userNumber + "_RX_" + (RX));
          }
        } else if (i == 3) {
          if (RY != controller.axes[i]) {
            RY = controller.axes[i];
            datachannel.send("G" + userNumber + "_RY_" + (RY));
          }
        }
      }
    }
    rAF(updateStatus);
  }

  function scangamepads() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && (gamepads[i].index in controllers)) {
        controllers[gamepads[i].index] = gamepads[i];
      }
    }
  }

  if (haveEvents) {
    window.addEventListener("gamepadconnected", connecthandler);
    window.addEventListener("gamepaddisconnected", disconnecthandler);
  } else if (haveWebkitEvents) {
    window.addEventListener("webkitgamepadconnected", connecthandler);
    window.addEventListener("webkitgamepaddisconnected", disconnecthandler);
  } else {
    setInterval(scangamepads, 500);
  }


}

var localConnection;
var datachannel;
var remoteConnection;
var remoteConnection2;

function openGamepadDataChannel() {
  localConnection = new RTCPeerConnection();
  datachannel = localConnection.createDataChannel(localUuid + "-gamepad");
  datachannel.onmessage = e => console.log("Message: " + e.data);
  datachannel.onopen = e => startGamepadHandlerAndSocketThread();
  localConnection.onicecandidate = e => sendLocalSDP();
  localConnection.createOffer().then(o => localConnection.setLocalDescription(o)).then(a => console.log("Created Gamepad Channel Offer Description Successfully"));
}

var hasSentLocalSDP = false;
var hasSentRemoteSDP = false;
var hasSentRemoteSDP2 = false;

function sendLocalSDP() {
  if (!hasSentLocalSDP) {
    serverConnection.send(JSON.stringify({ 'sdp': localConnection.localDescription, 'uuid': localUuid, 'dest': 'host' }));
    hasSentLocalSDP = true;
  }
}

function sendRemoteSDP(peerUuid) {
  if (!hasSentRemoteSDP) {
    serverConnection.send(JSON.stringify({ 'gamepadSDP': remoteConnection.localDescription, 'uuid': localUuid, 'dest': peerUuid }));
    hasSentRemoteSDP = true;
  }
}

function sendRemoteSDP2(peerUuid) {
  if (!hasSentRemoteSDP2) {
    serverConnection.send(JSON.stringify({ 'gamepadSDP': remoteConnection2.localDescription, 'uuid': localUuid, 'dest': peerUuid }));
    hasSentRemoteSDP2 = true;
  }
}

function handleGamepadMessageFromDriver(message) {
  console.log("Gamepad Input: " + message);
  localHostConnection.send(message);
}

var hasSetupDriver1GamepadChannel = false;

async function gotMessageFromServer(message) {
  var signal = JSON.parse(message.data);
  var peerUuid = signal.uuid;

  if (signal.dest === 'host' && !isDriver && !hasSetupDriver1GamepadChannel) {
    const offer = signal.sdp;
    remoteConnection = new RTCPeerConnection();
    remoteConnection.onicecandidate = e => sendRemoteSDP(peerUuid);
    remoteConnection.ondatachannel = e => {
      remoteConnection.dc = e.channel;
      remoteConnection.dc.onmessage = e => handleGamepadMessageFromDriver(e.data);
      remoteConnection.dc.onopen = e => console.log("Opened Gamepad Channel Successfully");
    }
    remoteConnection.setRemoteDescription(offer).then(a => console.log("Successfully setup SDP offer to remote description"));
    remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(a => console.log(JSON.stringify(remoteConnection.localDescription)));
    hasSetupDriver1GamepadChannel = true;
  } else if (signal.dest === 'host' && !isDriver && hasSetupDriver1GamepadChannel) {
    const offer = signal.sdp;
    remoteConnection2 = new RTCPeerConnection();
    remoteConnection2.onicecandidate = e => sendRemoteSDP2(peerUuid);
    remoteConnection2.ondatachannel = e => {
      remoteConnection2.dc = e.channel;
      remoteConnection2.dc.onmessage = e => handleGamepadMessageFromDriver(e.data);
      remoteConnection2.dc.onopen = e => console.log("Opened Gamepad Channel Successfully");
    }
    remoteConnection2.setRemoteDescription(offer).then(a => console.log("Successfully setup SDP offer to remote description"));
    remoteConnection2.createAnswer().then(a => remoteConnection2.setLocalDescription(a)).then(a => console.log(JSON.stringify(remoteConnection2.localDescription)));

  } else if (signal.dest == localUuid && isDriver && signal.gamepadSDP) {
    const answer = signal.gamepadSDP;
    localConnection.setRemoteDescription(answer).then(a => console.log("Successfully answered host's offer for gamepad channel"))
  }

  // Ignore messages that are not for us or from ourselves
  if (peerUuid == localUuid || (signal.dest != localUuid && signal.dest != 'all') || (!peerUuid.includes(roomName))) return;

  if (signal.displayName && signal.dest == 'all') {
    // set up peer connection object for a newcomer peer
    setUpPeer(peerUuid, signal.displayName);
    serverConnection.send(JSON.stringify({ 'displayName': localDisplayName, 'uuid': localUuid, 'dest': peerUuid }));

  } else if (signal.displayName && signal.dest == localUuid) {
    // initiate call if we are the newcomer peer
    setUpPeer(peerUuid, signal.displayName, true);

  } else if (signal.sdp) {
    peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid)).catch(errorHandler);
      }
    }).catch(errorHandler);

  } else if (signal.ice) {
    peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function setUpPeer(peerUuid, displayName, initCall = false) {
  peerConnections[peerUuid] = { 'displayName': displayName, 'pc': new RTCPeerConnection(peerConnectionConfig) };
  peerConnections[peerUuid].pc.onicecandidate = event => gotIceCandidate(event, peerUuid);
  peerConnections[peerUuid].pc.ontrack = event => gotRemoteStream(event, peerUuid);
  peerConnections[peerUuid].pc.oniceconnectionstatechange = event => checkPeerDisconnect(event, peerUuid);
  peerConnections[peerUuid].pc.addStream(localStream);

  if (peerUuid.includes("host-")) {
    openGamepadDataChannel();
  }
  if (initCall) {
    peerConnections[peerUuid].pc.createOffer({ offerToReceiveVideo: true }).then(description => createdDescription(description, peerUuid)).catch(errorHandler);
  }
}

function gotIceCandidate(event, peerUuid) {
  if (event.candidate != null) {
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': localUuid, 'dest': peerUuid }));
  }
}

function createdDescription(description, peerUuid) {
  console.log(`Received description for ${peerUuid}`);
  peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
    serverConnection.send(JSON.stringify({ 'sdp': peerConnections[peerUuid].pc.localDescription, 'uuid': localUuid, 'dest': peerUuid }));
  }).catch(errorHandler);
}

var previousPeerUUIDs = [];

function gotRemoteStream(event, peerUuid) {
  console.log(`Succesfully receieved stream of peer: "${peerUuid}"`);
  for (i = 0; i < previousPeerUUIDs.length; i++) {
    if (previousPeerUUIDs[i] == peerUuid) {
      return;
    }
  }
  previousPeerUUIDs[previousPeerUUIDs.length] = peerUuid;

  //assign stream to new HTML video element


  if (isDriver) {
    // if (peerUuid.includes("host-")) {
    var vidElement = document.createElement('video');
    vidElement.setAttribute('autoplay', '');
    // vidElement.setAttribute('muted', '');
    vidElement.srcObject = event.streams[0];

    var vidContainer = document.createElement('div');
    vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid);
    vidContainer.setAttribute('class', 'videoContainer');
    vidContainer.appendChild(vidElement);

    vidContainer.appendChild(makeLabel(peerConnections[peerUuid].displayName));
    document.getElementById('videos').appendChild(vidContainer);
    // }
  } else {
    var vidElement = document.createElement('video');
    vidElement.setAttribute('autoplay', '');
    // vidElement.setAttribute('muted', '');
    vidElement.srcObject = event.streams[0];

    var vidContainer = document.createElement('div');
    vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid);
    vidContainer.setAttribute('class', 'videoContainer');
    vidContainer.appendChild(vidElement);

    vidContainer.appendChild(makeLabel(peerConnections[peerUuid].displayName));
    document.getElementById('videos').appendChild(vidContainer);
  }


  updateLayout();
}

function checkPeerDisconnect(event, peerUuid) {
  var state = peerConnections[peerUuid].pc.iceConnectionState;
  console.log(`Connection with peer ${peerUuid}: ${state}`);
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete peerConnections[peerUuid];
    for (i = 0; i < previousPeerUUIDs.length; i++) {
      if (previousPeerUUIDs[i] == peerUuid) {
        delete peerUuid[i];
      }
    }
    previousPeerUUIDs[previousPeerUUIDs.length] = peerUuid;
    document.getElementById('videos').removeChild(document.getElementById('remoteVideo_' + peerUuid));
    updateLayout();
  } else {
    console.log("Connection with peer is stable");
  }
}

function updateLayout() {
  // update CSS grid based on number of diplayed videos
  var rowHeight = '98vh';
  var colWidth = '98vw';

  var numVideos = Object.keys(peerConnections).length; // add one to include local video

  if (!isDriver) {
    numVideos++;
  } else {
    // numVideos = 1;
  }

  if (numVideos > 1 && numVideos <= 4) { // 2x2 grid
    rowHeight = '48vh';
    colWidth = '48vw';
  } else if (numVideos > 4) { // 3x3 grid
    rowHeight = '32vh';
    colWidth = '32vw';
  }

  document.documentElement.style.setProperty(`--rowHeight`, rowHeight);
  document.documentElement.style.setProperty(`--colWidth`, colWidth);
}

function makeLabel(label) {
  var vidLabel = document.createElement('div');
  vidLabel.appendChild(document.createTextNode(label));
  vidLabel.setAttribute('class', 'videoLabel');
  return vidLabel;
}

function errorHandler(error) {
  console.log("Error occurred: " + error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID(isDriver) {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  if (isDriver) {
    return roomName + '-' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }
  return 'host-' + roomName + '-' + s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

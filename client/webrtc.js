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
    console.log(localDisplayName);
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

  console.log(constraints);

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
            console.log("ip:  " + robotIPaddress);
            serverConnection.send("IP: " + robotIPaddress);
          }
          if (isDriver) {
            startGamepadHandlerAndSocketThread();
          }
        }
      }).catch(errorHandler);

  } else {
    alert('Your browser does not support getUserMedia API');
  }
}

function startGamepadHandlerAndSocketThread() {

  var haveEvents = 'GamepadEvent' in window;
  var haveWebkitEvents = 'WebKitGamepadEvent' in window;
  var controllers = {};
  var rAF = window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.requestAnimationFrame;

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
        var pressed = val == 1.0;
        var touched = false;
        if (typeof (val) == "object") {
          pressed = val.pressed;
          if ('touched' in val) {
            touched = val.touched;
          }
          val = val.value;
        }
        if (pressed) {
          console.log("SOMETHING WAS PRESSED");
        }
        if (touched) {
          console.log("SOMETHING WAS TOUCHED");
        }
      }

      for (var i = 0; i < controller.axes.length; i++) { // leftX, leftY, rightX, rightY

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

function openGamepadDataChannel() {
  localConnection = new RTCPeerConnection();
  datachannel = localConnection.createDataChannel("gamepad");
  datachannel.onmessage = e => console.log("Message: " + e.data);
  datachannel.onopen = e => console.log("Open");
  localConnection.onicecandidate = e => serverConnection.send(JSON.stringify({ 'sdp': localConnection.localDescription, 'uuid': localUuid, 'dest': 'host' }));
  localConnection.createOffer().then(o => localConnection.setLocalDescription(o)).then(a => console.log("Set successfully"));
}

function handleGamepadMessageFromDriver(message) {
  localHostConnection.send(message);
}

async function gotMessageFromServer(message) {
  var signal = JSON.parse(message.data);
  var peerUuid = signal.uuid;

  if (signal.dest === 'host' && !isDriver) {
    console.log("peerUUID: " + peerUuid);
    const offer = signal.sdp;
    remoteConnection = new RTCPeerConnection();
    remoteConnection.onicecandidate = e => serverConnection.send(JSON.stringify({ 'gamepadSDP': remoteConnection.localDescription, 'uuid': localUuid, 'dest': peerUuid }));
    remoteConnection.ondatachannel = e => {
      remoteConnection.dc = e.channel;
      remoteConnection.dc.onmessage = e => handleGamepadMessageFromDriver(e.data);
      remoteConnection.dc.onopen = e => console.log("open!");
    }
    remoteConnection.setRemoteDescription(offer).then(a => console.log("done"));
    remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a)).then(a => console.log(JSON.stringify(remoteConnection.localDescription)));

  } else if (signal.dest == localUuid && isDriver && signal.gamepadSDP) {
    console.log("hi");
    const answer = signal.gamepadSDP;
    localConnection.setRemoteDescription(answer).then(a => console.log("done"))
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
  console.log(`got description, peer ${peerUuid}`);
  peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
    serverConnection.send(JSON.stringify({ 'sdp': peerConnections[peerUuid].pc.localDescription, 'uuid': localUuid, 'dest': peerUuid }));
  }).catch(errorHandler);
}

var previousPeerUUIDs = [];

function gotRemoteStream(event, peerUuid) {
  console.log(`got remote stream, peer ${peerUuid}`);
  for (i = 0; i < previousPeerUUIDs.length; i++) {
    if (previousPeerUUIDs[i] == peerUuid) {
      return;
    }
  }
  previousPeerUUIDs[previousPeerUUIDs.length] = peerUuid;

  //assign stream to new HTML video element


  if (isDriver) {
    // if (peerUuid.includes("host-")) {
    console.log("VALID HOST USER");
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
  console.log(`connection with peer ${peerUuid} ${state}`);
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
    console.log("OKAY");
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

  console.log(numVideos);

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
  console.log(error);
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

const socket = io();

const myFace = document.getElementById("myFace");

let myStream;
let myPeerConnection;

//Handling Media

let muted = false, cameraOff = false;
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const getCameras = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks();
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label == camera.label)
                option.selected = true;
            camerasSelect.appendChild(option);
        })
    } catch (e) {
        console.log(e);
    }
}

const getMedia = async (deviceId) => {
    try {
        myStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: deviceId ? { facingMode: "user" } : { deviceId: { exact: deviceId } }
        });
        myFace.srcObject = myStream;
        if (!deviceId)
            await getCameras();
    } catch (e) {
        console.log(e);
    }
}

muteBtn.addEventListener("click", event => {
    muted = !muted;
    myStream.getAudioTracks().forEach(track => track.enabled = !muted);
    if (muted) {
        muteBtn.innerText = "Unmute";
    } else {
        muteBtn.innerText = "Mute";
    }
});

cameraBtn.addEventListener("click", event => {
    cameraOff = !cameraOff;
    myStream.getVideoTracks().forEach(track => track.enabled = !cameraOff);
    if (cameraOff) {
        cameraBtn.innerText = "Start Video";
    } else {
        cameraBtn.innerText = "Stop Video";
    }
});

const handleCameraChange = async () => {
    await getMedia(camerasSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders()
            .find(sender => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

camerasSelect.addEventListener("input", handleCameraChange);

//Enter a room
let roomName;

const call = document.getElementById("call");
call.hidden = true;

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

const initCall = async () => {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

welcomeForm.addEventListener("submit", async event => {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
});

//Socket
socket.on("welcome", async () => {//offer should be generated on welcome event
    //set offer local description
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sending offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async offer => {//set answer local&remote description
    console.log("received offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    console.log("sending answer");
    socket.emit("answer", answer, roomName);
});

socket.on("answer", answer => {//set offer remote description
    console.log("received answer");
    myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice", ice => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
})
//RTC
const makeConnection = () => {
    myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", (data) => {
        console.log("sending candidate");
        socket.emit("ice", data.candidate, roomName);
    });
    myPeerConnection.addEventListener("addstream", data => {
        const peerStream = document.getElementById("peerStream");
        peerStream.srcObject = data.stream;
    });
    myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}
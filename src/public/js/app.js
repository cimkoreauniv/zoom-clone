const socket = io();

const welcome = document.getElementById("welcome");
const room = document.getElementById("room");
const form = welcome.querySelector("form");

let roomName;
room.hidden = true;

const addMessage = (message) => {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

const nameForm = document.getElementById("name").querySelector("form");
nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = nameForm.querySelector("input");
    const value = input.value;
    socket.emit("nickname", value);
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", input.value, () => {
        welcome.hidden = true;
        room.hidden = false;
        const h3 = room.querySelector("h3");
        h3.innerText = `Room: ${roomName}`;
        const msgForm = room.querySelector("#msg");
        
        msgForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const input = msgForm.querySelector("input");
            const value = input.value;
            socket.emit("new_message", value, roomName, () => {
                addMessage(`You: ${value}`);
            });
            input.value = "";
        });
    });
    roomName = input.value;
    input.value = "";
})

socket.on("welcome", (user) => {
    addMessage(`${user} joined`);
});

socket.on("bye", (user) => {
    addMessage(`${user} left`);
});

socket.on("new_message", addMessage);
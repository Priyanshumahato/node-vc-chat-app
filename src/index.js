const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const express = require("express");
const Filter = require("bad-words");
const { generateMessage } = require("./utils/messages");
const { generateMessagesLocation } = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUserInRoom,
} = require("./utils/users");

const app = express();
//to set up support for socket.io
//we created our own server rather than using the one ecpress created for us so that to enable socket in it
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

//websocket protocol(socket.io library)
//webSockets allows for full duplex communication
//webSocket is a seperate protocol from http
//persistent connection between client and server untill user is connected to the server
//we have client to server(someone writing a text) communication and server to client(reading someone's else text) too

//io.on will return this message when ever a client in connected to the server
// it happens in index .html which is a client side version of socket.io

// let count = 0;

//server (emit) -> client (receive) countUpdated
//client (emit) -> server (receive) increment

io.on("connection", (socket) => {
  console.log("New web socket sonnection");

  //socket.emit("message", generateMessage("Welcome!"));
  //socket.broadcast.emit("message", generateMessage("A new user has joined")); //emit to all connection except the person who joined
  //join help to create room
  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(room)
      .emit("message", generateMessage("Admin", `${user.username} has joined`));

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUserInRoom(user.room),
    });

    callback();

    //io.to.emit it send a message to everyone in a specefic room
    //socker.broadcast.to.emit send message to everyone expect the person who joined
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });
  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateMessagesLocation(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left the chat`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUserInRoom(user.room),
      });
    }
  });

  //   socket.emit("countUpdated", count); //to send an event to client we user socket.emit
  //   socket.on("increment", () => {
  //     count++;
  //     // socket.emit("countUpdated", count); // this only emits to single connection
  //     io.emit("countUpdated", count); this only emits to all connection
  //   });
});

server.listen(port, () => {
  console.log(`Server is up and running ${port}`);
});

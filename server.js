import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Track users { socket.id -> username }
let onlineUsers = new Map();
// Track usernames { username -> socket.id }
let userSockets = new Map();

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // User joins with a username
  socket.on("join", (username) => {
    onlineUsers.set(socket.id, username);
    userSockets.set(username, socket.id);

    // Notify all about online users
    io.emit("onlineUsers", Array.from(userSockets.keys()));
    console.log(`${username} joined!`);
  });

  // Handle public chat
  socket.on("chatMessage", (msg) => {
    const username = onlineUsers.get(socket.id) || "Anonymous";
    io.emit("chatMessage", { username, msg });
  });

  // Handle private message
  socket.on("privateMessage", ({ to, msg }) => {
    const fromUser = onlineUsers.get(socket.id);
    const toSocketId = userSockets.get(to);

    if (toSocketId) {
      io.to(toSocketId).emit("privateMessage", {
        from: fromUser,
        msg,
      });
      console.log(`📩 Private message from ${fromUser} to ${to}: ${msg}`);
    } else {
      socket.emit("privateMessageError", `User ${to} is not online`);
    }
  });

  // Typing indicator (public)
  socket.on("typing", () => {
    const username = onlineUsers.get(socket.id);
    socket.broadcast.emit("typing", username);
  });

  socket.on("stopTyping", () => {
    const username = onlineUsers.get(socket.id);
    socket.broadcast.emit("stopTyping", username);
  });

  // Disconnect
  socket.on("disconnect", () => {
    const username = onlineUsers.get(socket.id);
    console.log(" Disconnected:", username);

    onlineUsers.delete(socket.id);
    userSockets.delete(username);

    io.emit("onlineUsers", Array.from(userSockets.keys()));
  });
});

httpServer.listen(5000, () => {
  console.log(" Server running on http://localhost:5000");
});

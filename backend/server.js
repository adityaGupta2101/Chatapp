const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");

const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");

const {
    initializeSocket
} = require("./socket/socket");


dotenv.config();


const app = express();


app.use(
    cors({
        origin: "http://localhost:5173"
    })
);


app.use(
    express.json()
);

// STATIC UPLOAD FILES

app.use(
    "/uploads",
    express.static("uploads")
);

connectDB();


app.use(
    "/api/auth",
    authRoutes
);


app.use(
    "/api/messages",
    messageRoutes
);


app.use(
    "/api/users",
    userRoutes
);


const server =
    http.createServer(app);


const io =
    new Server(
        server,
        {
            cors: {
                origin:
                    "http://localhost:5173",

                methods: [
                    "GET",
                    "POST"
                ]
            }
        }
    );


initializeSocket(io);


const PORT = process.env.PORT || 5001;

server.listen(
    PORT,
    () => {

        console.log(
            `Server running on http://localhost:${PORT}`
        );

        console.log(
            "Socket.IO server ready"
        );
    }
);
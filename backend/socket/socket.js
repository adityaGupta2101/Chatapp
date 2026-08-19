const jwt = require("jsonwebtoken");
const Message = require("../models/Message");


// =====================================================
// ONLINE USERS
// userId -> socketId
// =====================================================

const onlineUsers = new Map();


// =====================================================
// SOCKET.IO INITIALIZATION
// =====================================================

const initializeSocket = (io) => {

    // =================================================
    // AUTHENTICATE SOCKET
    // =================================================

    io.use((socket, next) => {

        try {

            const token =
                socket.handshake.auth?.token;

            if (!token) {

                return next(
                    new Error(
                        "Authentication token required"
                    )
                );
            }


            const decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );


            socket.userId =
                decoded.userId;


            next();

        } catch (error) {

            console.error(
                "Socket authentication error:",
                error.message
            );


            next(
                new Error(
                    "Invalid token"
                )
            );
        }
    });


    // =================================================
    // USER CONNECTED
    // =================================================

    io.on(
        "connection",
        async (socket) => {

            const userId =
                String(socket.userId);


            console.log(
                `User connected: ${userId}`
            );


            // =================================================
            // SAVE USER -> SOCKET MAPPING
            // =================================================

            onlineUsers.set(
                userId,
                socket.id
            );


            // =================================================
            // SEND CURRENT ONLINE USERS
            // TO NEWLY CONNECTED USER
            // =================================================

            socket.emit(
                "online_users",
                Array.from(
                    onlineUsers.keys()
                )
            );


            // =================================================
            // INFORM OTHER USERS THAT THIS USER IS ONLINE
            // =================================================

            socket.broadcast.emit(
                "user_status",
                {
                    userId,
                    isOnline: true
                }
            );


            // =================================================
            // GET CURRENT ONLINE USERS
            // =================================================
            //
            // Chat.jsx can request the current list again
            // after its listeners are ready.
            //
            // =================================================

            socket.on(
                "get_online_users",
                () => {

                    socket.emit(
                        "online_users",
                        Array.from(
                            onlineUsers.keys()
                        )
                    );
                }
            );


            // =================================================
            // MARK OLD UNDELIVERED MESSAGES AS DELIVERED
            // =================================================

            try {

                const undeliveredMessages =
                    await Message.find({
                        receiver: userId,
                        delivered: false
                    });


                for (
                    const message
                    of undeliveredMessages
                ) {

                    message.delivered =
                        true;


                    await message.save();


                    // =================================================
                    // SEND DELIVERED EVENT TO ORIGINAL SENDER
                    // =================================================

                    const senderSocketId =
                        onlineUsers.get(
                            String(
                                message.sender
                            )
                        );


                    if (senderSocketId) {

                        io.to(
                            senderSocketId
                        ).emit(
                            "message_delivered",
                            {
                                messageId:
                                    message._id
                            }
                        );
                    }
                }

            } catch (error) {

                console.error(
                    "Delivery update error:",
                    error
                );
            }


            // =================================================
            // SEND MESSAGE
            // =================================================

            socket.on(
                "send_message",
                async (
                    data,
                    callback
                ) => {

                    try {

                        const {
                            receiverId,
                            message
                        } = data;


                        // =================================================
                        // VALIDATION
                        // =================================================

                        if (
                            !receiverId ||
                            !message?.trim()
                        ) {

                            return callback?.({
                                success: false,
                                message:
                                    "Receiver and message are required"
                            });
                        }


                        // =================================================
                        // CREATE MESSAGE
                        // =================================================

                        const newMessage =
                            await Message.create({

                                sender:
                                    userId,

                                receiver:
                                    receiverId,

                                message:
                                    message.trim(),

                                delivered:
                                    false,

                                seen:
                                    false
                            });


                        // =================================================
                        // CHECK RECEIVER ONLINE
                        // =================================================

                        const receiverSocketId =
                            onlineUsers.get(
                                String(
                                    receiverId
                                )
                            );


                        if (
                            receiverSocketId
                        ) {

                            // =================================================
                            // RECEIVER IS ONLINE
                            // =================================================

                            newMessage.delivered =
                                true;


                            await newMessage.save();


                            // =================================================
                            // SEND MESSAGE INSTANTLY
                            // =================================================

                            io.to(
                                receiverSocketId
                            ).emit(
                                "message_received",
                                newMessage
                            );


                            // =================================================
                            // TELL SENDER MESSAGE WAS DELIVERED
                            // =================================================

                            socket.emit(
                                "message_delivered",
                                {
                                    messageId:
                                        newMessage._id
                                }
                            );
                        }


                        // =================================================
                        // SEND RESPONSE TO SENDER
                        // =================================================

                        callback?.({

                            success:
                                true,

                            data:
                                newMessage
                        });

                    } catch (error) {

                        console.error(
                            "Socket send message error:",
                            error
                        );


                        callback?.({

                            success:
                                false,

                            message:
                                "Failed to send message"
                        });
                    }
                }
            );


            // =================================================
            // MESSAGE SEEN
            // =================================================

            socket.on(
                "message_seen",
                async ({
                    messageId,
                    senderId
                }) => {

                    try {

                        const message =
                            await Message.findById(
                                messageId
                            );


                        // =================================================
                        // MESSAGE NOT FOUND
                        // =================================================

                        if (!message) {

                            return;
                        }


                        // =================================================
                        // MAKE SURE CURRENT USER
                        // IS ACTUALLY THE RECEIVER
                        // =================================================

                        if (
                            String(
                                message.receiver
                            ) !==
                            userId
                        ) {

                            return;
                        }


                        // =================================================
                        // UPDATE MESSAGE STATUS
                        // =================================================

                        message.delivered =
                            true;


                        message.seen =
                            true;


                        await message.save();


                        // =================================================
                        // INFORM ORIGINAL SENDER
                        // =================================================

                        const senderSocketId =
                            onlineUsers.get(
                                String(
                                    senderId
                                )
                            );


                        if (
                            senderSocketId
                        ) {

                            io.to(
                                senderSocketId
                            ).emit(
                                "message_seen",
                                {
                                    messageId:
                                        message._id
                                }
                            );
                        }

                    } catch (error) {

                        console.error(
                            "Message seen error:",
                            error
                        );
                    }
                }
            );


            // =================================================
            // USER DISCONNECTED
            // =================================================

            socket.on(
                "disconnect",
                () => {

                    console.log(
                        `User disconnected: ${userId}`
                    );


                    // =================================================
                    // REMOVE ONLY IF THIS SOCKET
                    // BELONGS TO THE STORED USER
                    // =================================================

                    if (
                        onlineUsers.get(
                            userId
                        ) ===
                        socket.id
                    ) {

                        onlineUsers.delete(
                            userId
                        );


                        // =================================================
                        // TELL EVERYONE USER WENT OFFLINE
                        // =================================================

                        socket.broadcast.emit(
                            "user_status",
                            {
                                userId,
                                isOnline:
                                    false
                            }
                        );
                    }
                }
            );
        }
    );
};
// =====================================================
// EXPORT
// =====================================================

module.exports = {
    initializeSocket,
    onlineUsers
};
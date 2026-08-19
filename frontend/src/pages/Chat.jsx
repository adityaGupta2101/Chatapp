import {
    useEffect,
    useRef,
    useState
} from "react";

import axios from "axios";

import {
    useNavigate
} from "react-router-dom";

import {
    useSocket
} from "../context/SocketContext";

import "../App.css";


const Chat = () => {

    // =====================================================
    // NAVIGATION
    // =====================================================

    const navigate = useNavigate();


    // =====================================================
    // SOCKET
    // =====================================================

    const { socket } = useSocket();


    // =====================================================
    // LOGGED-IN USER
    // =====================================================

    const user = JSON.parse(
        localStorage.getItem("user")
    );

    const token =
        localStorage.getItem("token");


    // =====================================================
    // STATES
    // =====================================================

    const [users, setUsers] =
        useState([]);

    const [selectedUser, setSelectedUser] =
        useState(null);

    const [messages, setMessages] =
        useState([]);

    const [message, setMessage] =
        useState("");


    // =====================================================
    // FILE STATES
    // =====================================================

    const [selectedFile, setSelectedFile] =
        useState(null);

    const [uploadingFile, setUploadingFile] =
        useState(false);


    // =====================================================
    // FILE INPUT REF
    // =====================================================

    const fileInputRef =
        useRef(null);

        const messagesEndRef =
    useRef(null);

    const messagesContainerRef = useRef(null);

    // =====================================================
// VOICE RECORDING
// =====================================================

const [isRecording, setIsRecording] = useState(false);
const [recordingTime, setRecordingTime] = useState(0);

const mediaRecorderRef = useRef(null);
const audioChunksRef = useRef([]);
const recordingTimerRef = useRef(null);

// useEffect(() => {
//     if (!messagesEndRef.current) {
//         return;
//     }

//     messagesEndRef.current.scrollIntoView({
//         behavior: "smooth"
//     });
// }, [messages]); 

useEffect(() => {

    const container = messagesContainerRef.current;

    if (!container) {
        return;
    }

    const isNearBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
        150;

    if (isNearBottom) {

        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });

    }

}, [messages]);
    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {

        localStorage.removeItem("token");

        localStorage.removeItem("user");

        navigate("/login");
    };


    // =====================================================
    // GET ALL USERS
    // =====================================================

    const fetchUsers = async () => {

        try {

            const response =
                await axios.get(
                    "http://localhost:5000/api/users",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );


            // Remove logged-in user

            const otherUsers =
                response.data.users.filter(
                    (item) =>
                        String(item._id) !==
                        String(user?.id)
                );


            setUsers(otherUsers);


            // Automatically select first user

            if (
                otherUsers.length > 0 &&
                !selectedUser
            ) {

                setSelectedUser(
                    otherUsers[0]
                );
            }


        } catch (error) {

            console.error(
                "Error fetching users:",
                error.response?.data ||
                error.message
            );
        }
    };


    // =====================================================
    // GET MESSAGES
    // =====================================================

    const fetchMessages =
        async (receiverId) => {

            try {

                const response =
                    await axios.get(
                        `http://localhost:5000/api/messages/${receiverId}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );


                setMessages(
                    response.data.messages
                );


                // Mark unread received messages as seen

                if (socket) {

                    response.data.messages
                        .filter(
                            (msg) =>
                                String(msg.sender) ===
                                String(receiverId) &&
                                !msg.seen
                        )
                        .forEach(
                            (msg) => {

                                socket.emit(
                                    "message_seen",
                                    {
                                        messageId:
                                            msg._id,

                                        senderId:
                                            msg.sender
                                    }
                                );
                            }
                        );
                }


            } catch (error) {

                console.error(
                    "Error fetching messages:",
                    error.response?.data ||
                    error.message
                );
            }
        };


    // =====================================================
    // LOAD USERS
    // =====================================================

    useEffect(() => {

        fetchUsers();

    }, []);


    // =====================================================
    // SELECTED USER CHANGED
    // =====================================================

    useEffect(() => {

        if (
            selectedUser &&
            socket
        ) {

            fetchMessages(
                selectedUser._id
            );
        }

    }, [
        selectedUser,
        socket
    ]);


    // =====================================================
    // REAL-TIME SOCKET EVENTS
    // =====================================================

    useEffect(() => {

        if (!socket) {
            return;
        }


        // =================================================
        // NEW MESSAGE RECEIVED
        // =================================================

        const handleMessageReceived =
            (newMessage) => {

                console.log(
                    "Real-time message:",
                    newMessage
                );


                const isCurrentChat =
                    selectedUser &&
                    String(newMessage.sender) ===
                    String(selectedUser._id);


                if (isCurrentChat) {

                    setMessages(
                        (previousMessages) => {

                            const alreadyExists =
                                previousMessages.some(
                                    (msg) =>
                                        String(msg._id) ===
                                        String(newMessage._id)
                                );


                            if (alreadyExists) {
                                return previousMessages;
                            }


                            return [
                                ...previousMessages,
                                newMessage
                            ];
                        }
                    );


                    // Receiver has opened conversation

                    socket.emit(
                        "message_seen",
                        {
                            messageId:
                                newMessage._id,

                            senderId:
                                newMessage.sender
                        }
                    );
                }
            };


        // =================================================
        // MESSAGE DELIVERED
        // =================================================

        const handleMessageDelivered =
            ({ messageId }) => {

                setMessages(
                    (previousMessages) =>
                        previousMessages.map(
                            (msg) => {

                                if (
                                    String(msg._id) ===
                                    String(messageId)
                                ) {

                                    return {
                                        ...msg,
                                        delivered: true
                                    };
                                }

                                return msg;
                            }
                        )
                );
            };


        // =================================================
        // MESSAGE SEEN
        // =================================================

        const handleMessageSeen =
            ({ messageId }) => {

                setMessages(
                    (previousMessages) =>
                        previousMessages.map(
                            (msg) => {

                                if (
                                    String(msg._id) ===
                                    String(messageId)
                                ) {

                                    return {
                                        ...msg,
                                        delivered: true,
                                        seen: true
                                    };
                                }

                                return msg;
                            }
                        )
                );
            };
// =================================================
        // USER ONLINE / OFFLINE
        // =================================================
const handleOnlineUsers = (onlineUserIds) => {

    setUsers((previousUsers) =>
        previousUsers.map((item) => ({
            ...item,
            isOnline: onlineUserIds.some(
                (id) =>
                    String(id) === String(item._id)
            )
        }))
    );


    setSelectedUser((previousSelected) => {

        if (!previousSelected) {
            return previousSelected;
        }


        return {
            ...previousSelected,

            isOnline: onlineUserIds.some(
                (id) =>
                    String(id) ===
                    String(previousSelected._id)
            )
        };
    });
};
        
        const handleUserStatus =
            ({
                userId,
                isOnline
            }) => {

                setUsers(
                    (previousUsers) =>
                        previousUsers.map(
                            (item) => {

                                if (
                                    String(item._id) ===
                                    String(userId)
                                ) {

                                    return {
                                        ...item,
                                        isOnline
                                    };
                                }

                                return item;
                            }
                        )
                );


                // Update selected user

                setSelectedUser(
                    (previousSelected) => {

                        if (!previousSelected) {
                            return previousSelected;
                        }


                        if (
                            String(
                                previousSelected._id
                            ) ===
                            String(userId)
                        ) {

                            return {
                                ...previousSelected,
                                isOnline
                            };
                        }


                        return previousSelected;
                    }
                );
            };


        // =================================================
        // REGISTER EVENTS
        // =================================================

        socket.on(
            "message_received",
            handleMessageReceived
        );

        socket.on(
            "message_delivered",
            handleMessageDelivered
        );

        socket.on(
            "message_seen",
            handleMessageSeen
        );

        socket.on(
            "user_status",
            handleUserStatus
        );
         socket.on(
    "online_users",
    handleOnlineUsers
);

socket.emit(
    "get_online_users"
);



        // =================================================
        // CLEANUP
        // =================================================

        return () => {

            socket.off(
                "message_received",
                handleMessageReceived
            );

            socket.off(
                "message_delivered",
                handleMessageDelivered
            );

            socket.off(
                "message_seen",
                handleMessageSeen
            );

            socket.off(
                "user_status",
                handleUserStatus
            );

            socket.off(
    "online_users",
    handleOnlineUsers
);

        };

    }, [
        socket,
        selectedUser
    ]);


    // =====================================================
    // SELECT USER
    // =====================================================

    const handleSelectUser =
        (selected) => {

            // Clear previously selected file
            setSelectedFile(null);

            setSelectedUser(
                selected
            );
        };


    // =====================================================
    // SEND TEXT MESSAGE
    // =====================================================

    const sendTextMessage = () => {

        if (!message.trim()) {
            return;
        }


        if (!selectedUser) {
            return;
        }


        if (!socket) {

            console.error(
                "Socket is not connected"
            );

            return;
        }


        const text =
            message.trim();


        socket.emit(
            "send_message",
            {
                receiverId:
                    selectedUser._id,

                message:
                    text
            },

            (response) => {

                console.log(
                    "Socket send response:",
                    response
                );


                if (
                    !response ||
                    !response.success
                ) {

                    console.error(
                        "Message failed:",
                        response?.message
                    );

                    return;
                }


                // Add sent message to own chat

                setMessages(
                    (previousMessages) => {

                        const alreadyExists =
                            previousMessages.some(
                                (msg) =>
                                    String(msg._id) ===
                                    String(
                                        response.data._id
                                    )
                            );


                        if (alreadyExists) {
                            return previousMessages;
                        }


                        return [
                            ...previousMessages,
                            response.data
                        ];
                    }
                );


                // Clear text

                setMessage("");
            }
        );
    };


    // =====================================================
    // FILE SELECTOR
    // =====================================================

    const handleAttachmentClick = () => {

        if (!selectedUser) {
            return;
        }

        fileInputRef.current?.click();
    };


    // =====================================================
    // FILE SELECTED
    // =====================================================

    const handleFileChange = (event) => {

        const file =
            event.target.files?.[0];


        if (!file) {
            return;
        }


        if (!selectedUser) {

            console.error(
                "Please select a user first"
            );

            return;
        }


        // IMPORTANT:
        // Only select the file.
        // DO NOT upload here.

        setSelectedFile(file);


        // Reset input so the same file
        // can be selected again later.

        event.target.value = "";
    };


    // =====================================================
    // REMOVE SELECTED FILE
    // =====================================================

    const handleRemoveSelectedFile = () => {

        setSelectedFile(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };


    // =====================================================
    // UPLOAD FILE
    // =====================================================

    const uploadFile =
        async (file) => {

            try {

                setUploadingFile(true);


                const formData =
                    new FormData();


                formData.append(
                    "receiverId",
                    selectedUser._id
                );


                formData.append(
                    "file",
                    file
                );


                console.log(
                    "Uploading file:",
                    file.name
                );


                const response =
                    await axios.post(
                        "http://localhost:5000/api/messages/upload",
                        formData,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );


                console.log(
                    "File upload response:",
                    response.data
                );


                const uploadedMessage =
                    response.data.data;


                // Add uploaded file to current chat

                setMessages(
                    (previousMessages) => {

                        const alreadyExists =
                            previousMessages.some(
                                (msg) =>
                                    String(msg._id) ===
                                    String(
                                        uploadedMessage._id
                                    )
                            );


                        if (alreadyExists) {
                            return previousMessages;
                        }


                        return [
                            ...previousMessages,
                            uploadedMessage
                        ];
                    }
                );


                // Clear selected file

                setSelectedFile(null);


            } catch (error) {

                console.error(
                    "File upload error:",
                    error.response?.data ||
                    error.message
                );

            } finally {

                setUploadingFile(false);
            }
        };




        // =====================================================
// START VOICE RECORDING
// =====================================================

const startRecording = async () => {

    if (!selectedUser) {
        return;
    }

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        const mediaRecorder =
            new MediaRecorder(stream);

        mediaRecorderRef.current =
            mediaRecorder;

        audioChunksRef.current = [];

        mediaRecorder.ondataavailable =
            (event) => {

                if (event.data.size > 0) {

                    audioChunksRef.current.push(
                        event.data
                    );
                }
            };

        mediaRecorder.onstop = () => {

            stream.getTracks().forEach(
                (track) => track.stop()
            );
        };

        mediaRecorder.start();

        setIsRecording(true);
        setRecordingTime(0);

        recordingTimerRef.current =
            setInterval(() => {

                setRecordingTime(
                    (previousTime) =>
                        previousTime + 1
                );

            }, 1000);

    } catch (error) {

        console.error(
            "Microphone permission error:",
            error
        );

        alert(
            "Please allow microphone permission to record voice."
        );
    }
};


    // =====================================================
    // MAIN SEND FUNCTION
    // =====================================================

    const handleSend = async () => {

        if (!selectedUser) {
            return;
        }


        // =================================================
        // FILE HAS PRIORITY
        // =================================================

        if (selectedFile) {

            await uploadFile(
                selectedFile
            );

            return;
        }


        // =================================================
        // TEXT MESSAGE
        // =================================================

        sendTextMessage();
    };


    // =====================================================
    // FORMAT FILE SIZE
    // =====================================================

    const formatFileSize =
        (bytes) => {

            if (!bytes) {
                return "";
            }


            if (bytes < 1024) {

                return `${bytes} B`;
            }


            if (
                bytes <
                1024 * 1024
            ) {

                return `${(
                    bytes / 1024
                ).toFixed(1)} KB`;
            }


            return `${(
                bytes /
                (1024 * 1024)
            ).toFixed(1)} MB`;
        };


    // =====================================================
    // FORMAT TIME
    // =====================================================

    const formatTime =
        (date) => {

            return new Date(
                date
            ).toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
        };


    // =====================================================
    // RENDER FILE MESSAGE
    // =====================================================

    const renderFileMessage =
        (msg) => {

            const fileUrl =
                `http://localhost:5000${msg.fileUrl}`;


            // =================================================
            // IMAGE
            // =================================================

            if (
                msg.messageType ===
                "image"
            ) {

                return (

                    <div className="media-message">

                        <img
                            src={fileUrl}
                            alt={
                                msg.fileName ||
                                "Image"
                            }
                            className="chat-image"
                        />

                        {msg.fileName && (

                            <div className="media-file-name">

                                {msg.fileName}

                            </div>

                        )}

                    </div>
                );
            }


            // =================================================
            // VIDEO
            // =================================================

            if (
                msg.messageType ===
                "video"
            ) {

                return (

                    <div className="media-message">

                        <video
                            src={fileUrl}
                            controls
                            className="chat-video"
                        />

                        <div className="media-file-name">

                            {msg.fileName}

                        </div>

                    </div>
                );
            }


            // =================================================
            // AUDIO
            // =================================================

            if (
                msg.messageType ===
                "audio"
            ) {

                return (

                    <div className="media-message">

                        <audio
                            src={fileUrl}
                            controls
                            className="chat-audio"
                        />

                        <div className="media-file-name">

                            {msg.fileName}

                        </div>

                    </div>
                );
            }


            // =================================================
            // NORMAL FILE
            // =================================================

            return (

                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chat-file"
                >

                    <i className="bi bi-file-earmark-fill"></i>


                    <div className="chat-file-info">

                        <strong>
                            {msg.fileName ||
                                "Download file"}
                        </strong>

                        <small>
                            {formatFileSize(
                                msg.fileSize
                            )}
                        </small>

                    </div>

                </a>
            );
        };


    // =====================================================
    // UI
    // =====================================================

    return (

        <div className="chat-container">


            {/* =================================================
                SIDEBAR
            ================================================= */}

            <div className="chat-sidebar">


                <div className="sidebar-header">

                    <h2>
                        Chats
                    </h2>


                    <button
                        className="logout-button"
                        onClick={
                            handleLogout
                        }
                    >

                        <i className="bi bi-box-arrow-right"></i>

                        Logout

                    </button>

                </div>


                {/* =================================================
                    USERS
                ================================================= */}

                {users.length === 0 ? (

                    <div className="empty-users">

                        No users found

                    </div>

                ) : (

                    users.map(
                        (item) => (

                            <div
                                key={item._id}
                                className={
                                    selectedUser?._id ===
                                    item._id
                                        ? "chat-user active-chat"
                                        : "chat-user"
                                }
                                onClick={() =>
                                    handleSelectUser(
                                        item
                                    )
                                }
                            >

                                <div className="user-avatar">

                                    {item.name
                                        ?.charAt(0)
                                        .toUpperCase()}

                                </div>


                                <div className="user-info">

                                    <strong>
                                        {item.name}
                                    </strong>

                                    <p>
                                        {item.email}
                                    </p>

                                </div>


                                {/* Online indicator */}

                                <div
                                    className={
                                        item.isOnline
                                            ? "online-dot online"
                                            : "online-dot"
                                    }
                                />

                            </div>
                        )
                    )
                )}

            </div>


            {/* =================================================
                CHAT SECTION
            ================================================= */}

            <div className="chat-section">


                {/* =================================================
                    CHAT HEADER
                ================================================= */}

                {selectedUser ? (

                    <div className="chat-header">

                        <div className="user-avatar">

                            {selectedUser.name
                                ?.charAt(0)
                                .toUpperCase()}

                        </div>


                        <div>

                            <h3>
                                {selectedUser.name}
                            </h3>


                            <span className="online-status">

                                {selectedUser.isOnline
                                    ? "Online"
                                    : "Offline"}

                            </span>

                        </div>

                    </div>

                ) : (

                    <div className="chat-header">

                        <h3>
                            Select a user to start chatting
                        </h3>

                    </div>

                )}


                {/* =================================================
                    MESSAGES
                ================================================= */}

    <div
    className="messages-container"
    ref={messagesContainerRef}
>

                    {!selectedUser ? (

                        <div className="empty-chat">

                            Select someone from the sidebar 👈
                            

                        </div>

                    ) : messages.length === 0 ? (

                        <div className="empty-chat">

                            No messages yet.
                            Start a conversation 👋

                        </div>

                    ) : (

                        messages.map(
                            (msg) => {
                                

                                const isMyMessage =
                                    String(
                                        msg.sender
                                    ) ===
                                    String(
                                        user?.id

                        
                                    );

                            
                                const isFileMessage =
                                    msg.messageType &&
                                    msg.messageType !==
                                    "text";


                                return (

                                    <div
                                        key={msg._id}
                                        className={
                                            isMyMessage
                                                ? "message-row my-message"
                                                : "message-row"
                                        }
                                    >

                                        <div className="message-bubble">


                                            {/* ==========================================
                                                FILE / MEDIA
                                            ========================================== */}

                                            {isFileMessage ? (

                                                renderFileMessage(
                                                    msg
                                                )

                                            ) : (

                                                <span>
                                                    {msg.message}
                                                </span>

                                            )}


                                            {/* ==========================================
                                                MESSAGE META
                                            ========================================== */}

                                            <small className="message-meta">

                                                {formatTime(
                                                    msg.createdAt
                                                )}


                                                {/* MESSAGE TICKS */}

                                                {isMyMessage && (

                                                    <span
                                                        className={
                                                            msg.seen
                                                                ? "message-ticks seen"
                                                                : msg.delivered
                                                                    ? "message-ticks delivered"
                                                                    : "message-ticks sent"
                                                        }
                                                    >

                                                        {msg.seen
                                                            ? "✓✓"
                                                            : msg.delivered
                                                                ? "✓✓"
                                                                : "✓"}

                                                    </span>

                                                )}

                                            </small>

                                        </div>

                                    </div>
                                );
                            }
                        )

                    )}
                    <div ref={messagesEndRef}></div>
                    
                   
                </div>


                {/* =================================================
                    MESSAGE INPUT
                ================================================= */}

                {selectedUser && (

                    <>

                        {/* ==========================================
                            SELECTED FILE PREVIEW
                        ========================================== */}

                        {selectedFile && (

                            <div className="selected-file-preview">

                                <div className="selected-file-info">

                                    <i className="bi bi-file-earmark"></i>

                                    <span>
                                        {selectedFile.name}
                                    </span>

                                </div>


                                <button
                                    type="button"
                                    className="remove-file-button"
                                    onClick={
                                        handleRemoveSelectedFile
                                    }
                                >

                                    <i className="bi bi-x-lg"></i>

                                </button>

                            </div>

                        )}


                        {/* ==========================================
                            INPUT AREA
                        ========================================== */}

                        <div className="message-input-container">


                            {/* ==========================================
                                HIDDEN FILE INPUT
                            ========================================== */}

                            {/* <input
                                ref={
                                    fileInputRef
                                }
                                type="file"
                                className="file-input-hidden"
                                onChange={
                                    handleFileChange
                                }
                            />
 */}

                            {/* ==========================================
                                ATTACHMENT BUTTON
                            ========================================== */}

                           <label
    htmlFor="media-file-input"
    className="media-button"
    title="Attach file"
>
    <i className="bi bi-paperclip"></i>
</label>

<input
    id="media-file-input"
    type="file"
    className="hidden-file-input"
    onChange={handleFileChange}
/>


                            {/* ==========================================
                                TEXT INPUT
                            ========================================== */}

                            <input
                                type="text"
                                placeholder={
                                    uploadingFile
                                        ? "Uploading file..."
                                        : selectedFile
                                            ? "Click send to share file..."
                                            : `Message ${selectedUser.name}...`
                                }
                                value={
                                    message
                                }
                                disabled={
                                    uploadingFile
                                }
                                onChange={(e) =>
                                    setMessage(
                                        e.target.value
                                    )
                                }
                                onKeyDown={(e) => {

                                    if (
                                        e.key ===
                                        "Enter"
                                    ) {

                                        handleSend();
                                    }

                                }}
                            />


                            {/* ==========================================
                                SEND BUTTON
                            ========================================== */}

                            <button
                                type="button"
                                className="send-button"
                                onClick={
                                    handleSend
                                }
                                disabled={
                                    uploadingFile ||
                                    (
                                        !message.trim() &&
                                        !selectedFile
                                    )
                                }
                                aria-label={
                                    selectedFile
                                        ? "Send file"
                                        : "Send message"
                                }
                                title={
                                    selectedFile
                                        ? "Send file"
                                        : "Send message"
                                }
                            >

                                {uploadingFile ? (

                                    <i className="bi bi-arrow-repeat"></i>

                                ) : (

                                    <i className="bi bi-send-fill"></i>

                                )}

                            </button>

                        </div>

                    </>

                )}

            </div>

        </div>
    );
};
export default Chat;
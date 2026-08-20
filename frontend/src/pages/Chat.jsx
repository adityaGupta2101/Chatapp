import {
    useEffect,
    useRef,
    useState
} from "react";

import API, { BASE_URL } from "../services/api";

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

    const [selectedFiles, setSelectedFiles] =
        useState([]);

    const [uploadingFile, setUploadingFile] =
        useState(false);


    // =====================================================
    // FILE INPUT REF
    // =====================================================

    const fileInputRef =
        useRef(null);


    // =====================================================
    // MESSAGE SCROLL REFS
    // =====================================================

    const messagesEndRef =
        useRef(null);

    const messagesContainerRef =
        useRef(null);


    // =====================================================
    // IMPORTANT SCROLL CONTROL
    // =====================================================

    /*
        This ref tells us whether the next messages update
        should scroll to the bottom.

        "auto"   = instant scroll (when opening chat)
        "smooth" = smooth scroll (new messages)
        false    = don't disturb user's current position
    */

    const shouldScrollToBottomRef =
        useRef(false);


    // =====================================================
    // VOICE RECORDING
    // =====================================================

    const [isRecording, setIsRecording] =
        useState(false);

    const [recordingTime, setRecordingTime] =
        useState(0);

    const mediaRecorderRef =
        useRef(null);

    const audioChunksRef =
        useRef([]);

    const recordingTimerRef =
        useRef(null);


    // =====================================================
    // SCROLL HELPER
    // =====================================================

    const scrollToBottom = (
        behavior = "smooth"
    ) => {

        if (!messagesEndRef.current) {
            return;
        }

        messagesEndRef.current.scrollIntoView({
            behavior
        });
    };


    // =====================================================
    // CHECK WHETHER USER IS NEAR BOTTOM
    // =====================================================

    const isUserNearBottom = () => {

        const container =
            messagesContainerRef.current;

        if (!container) {
            return true;
        }

        const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;

        return distanceFromBottom < 300;
    };


    // =====================================================
    // SCROLL AFTER MESSAGES ARE RENDERED
    // =====================================================

    useEffect(() => {

        if (!shouldScrollToBottomRef.current) {
            return;
        }

        /*
            Wait for React to render the new messages
            before scrolling.
        */
       
        const behavior = shouldScrollToBottomRef.current === true 
            ? "smooth" 
            : shouldScrollToBottomRef.current;

        requestAnimationFrame(() => {

            scrollToBottom(behavior);

            shouldScrollToBottomRef.current =
                false;
        });

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
                await API.get(
                    "/users",
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
                    await API.get(
                        `/messages/${receiverId}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );


                /*
                    IMPORTANT CHANGE:

                    When opening a chat, we ALWAYS want
                    to go to the latest message.
                */

                shouldScrollToBottomRef.current =
                    "auto";


                setMessages(
                    response.data.messages
                );


                // =================================================
                // MARK UNREAD RECEIVED MESSAGES AS SEEN
                // =================================================

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
            selectedUser?._id &&
            socket
        ) {

            /*
                Opening another chat should always
                start at the latest message.
            */

            shouldScrollToBottomRef.current =
                "auto";

            fetchMessages(
                selectedUser._id
            );
        }

    }, [
        selectedUser?._id,
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


                if (!isCurrentChat) {
                    return;
                }


                /*
                    IMPORTANT:

                    Check user's position BEFORE
                    adding the new message.

                    If user is reading old messages,
                    don't scroll.

                    If user is already near bottom,
                    scroll to new message.
                */

                const wasNearBottom =
                    isUserNearBottom();


                if (wasNearBottom) {

                    shouldScrollToBottomRef.current =
                        "smooth";
                }


                setMessages(
                    (previousMessages) => {

                        const alreadyExists =
                            previousMessages.some(
                                (msg) =>
                                    String(msg._id) ===
                                    String(
                                        newMessage._id
                                    )
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
            };


        // =================================================
        // MESSAGE DELIVERED
        // =================================================

        const handleMessageDelivered =
            ({ messageId }) => {

                /*
                    DO NOT set scroll flag here.

                    Delivery status changes should NOT
                    move user's scrollbar.
                */

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

                /*
                    DO NOT scroll here.

                    Seen status should never disturb
                    user's current reading position.
                */

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

        const handleOnlineUsers =
            (onlineUserIds) => {

                setUsers(
                    (previousUsers) =>
                        previousUsers.map(
                            (item) => ({

                                ...item,

                                isOnline:
                                    onlineUserIds.some(
                                        (id) =>
                                            String(id) ===
                                            String(
                                                item._id
                                            )
                                    )
                            })
                        )
                );


                setSelectedUser(
                    (previousSelected) => {

                        if (!previousSelected) {
                            return previousSelected;
                        }


                        return {
                            ...previousSelected,

                            isOnline:
                                onlineUserIds.some(
                                    (id) =>
                                        String(id) ===
                                        String(
                                            previousSelected._id
                                        )
                                )
                        };
                    }
                );
            };


        // =================================================
        // USER STATUS
        // =================================================

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
        // REGISTER SOCKET EVENTS
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

            setSelectedFiles([]);

            /*
                Opening a chat should always start
                at the latest message.
            */

            shouldScrollToBottomRef.current =
                "auto";

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


        /*
            Sending our own message should always
            take us to the latest message.
        */

        shouldScrollToBottomRef.current =
            "smooth";


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

                    shouldScrollToBottomRef.current =
                        false;

                    return;
                }


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

    const handleFileChange =
        (event) => {

            const files =
                Array.from(event.target.files);

            if (files.length === 0) {
                return;
            }

            if (!selectedUser) {
                console.error(
                    "Please select a user first"
                );
                return;
            }

            if (files.length > 10) {
                console.error("Maximum 10 files can be selected");
                alert("You can only select up to 10 files at once.");
                return;
            }

            setSelectedFiles(files);
            event.target.value = "";
        };


    // =====================================================
    // REMOVE SELECTED FILE
    // =====================================================

    const handleRemoveSelectedFile = (index) => {

        setSelectedFiles(prev => prev.filter((_, i) => i !== index));

        if (fileInputRef.current && selectedFiles.length <= 1) {
            fileInputRef.current.value = "";
        }
    };


    // =====================================================
    // UPLOAD FILE
    // =====================================================

    const uploadFiles = async (files) => {
        try {
            setUploadingFile(true);

            /*
                File sent by us should always
                appear at the bottom.
            */
            shouldScrollToBottomRef.current = "smooth";

            const formData = new FormData();

            formData.append("receiverId", selectedUser._id);

            files.forEach(file => {
                formData.append("files", file);
            });

            console.log(`Uploading ${files.length} files...`);

            const response = await API.post(
                "/messages/upload",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            console.log("File upload response:", response.data);

            const uploadedMessages = response.data.data;

            setMessages((previousMessages) => {
                const newMessages = uploadedMessages.filter(
                    newMsg => !previousMessages.some(msg => String(msg._id) === String(newMsg._id))
                );
                return [...previousMessages, ...newMessages];
            });

            setSelectedFiles([]);

        } catch (error) {
            console.error(
                "File upload error:",
                error.response?.data || error.message
            );
        } finally {
            setUploadingFile(false);
        }
    };


    // =====================================================
    // START VOICE RECORDING
    // =====================================================

    const startRecording =
        async () => {

            if (!selectedUser) {
                return;
            }


            try {

                const stream =
                    await navigator.mediaDevices
                        .getUserMedia({
                            audio: true
                        });


                const mediaRecorder =
                    new MediaRecorder(
                        stream
                    );


                mediaRecorderRef.current =
                    mediaRecorder;


                audioChunksRef.current =
                    [];


                mediaRecorder.ondataavailable =
                    (event) => {

                        if (
                            event.data.size > 0
                        ) {

                            audioChunksRef.current.push(
                                event.data
                            );
                        }
                    };


                mediaRecorder.onstop =
                    () => {

                        stream
                            .getTracks()
                            .forEach(
                                (track) =>
                                    track.stop()
                            );
                    };


                mediaRecorder.start();


                setIsRecording(true);

                setRecordingTime(0);


                recordingTimerRef.current =
                    setInterval(
                        () => {

                            setRecordingTime(
                                (previousTime) =>
                                    previousTime + 1
                            );

                        },
                        1000
                    );

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
    // DELETE / CANCEL VOICE RECORDING
    // =====================================================

    const deleteRecording = () => {

        if (
            mediaRecorderRef.current
        ) {

            if (
                mediaRecorderRef.current
                    .state !==
                "inactive"
            ) {

                mediaRecorderRef.current
                    .stop();
            }
        }


        if (
            recordingTimerRef.current
        ) {

            clearInterval(
                recordingTimerRef.current
            );

            recordingTimerRef.current =
                null;
        }


        audioChunksRef.current = [];


        setIsRecording(false);

        setRecordingTime(0);


        mediaRecorderRef.current =
            null;
    };


    // =====================================================
    // SEND VOICE RECORDING
    // =====================================================

    const sendRecording = () => {

        if (
            !mediaRecorderRef.current
        ) {
            return;
        }


        const recorder =
            mediaRecorderRef.current;


        recorder.onstop =
            async () => {

                if (
                    recordingTimerRef.current
                ) {

                    clearInterval(
                        recordingTimerRef.current
                    );

                    recordingTimerRef.current =
                        null;
                }


                const audioBlob =
                    new Blob(
                        audioChunksRef.current,
                        {
                            type:
                                "audio/webm"
                        }
                    );


                const audioFile =
                    new File(
                        [audioBlob],
                        `voice-${Date.now()}.webm`,
                        {
                            type:
                                "audio/webm"
                        }
                    );


                const formData =
                    new FormData();


                formData.append(
                    "receiverId",
                    selectedUser._id
                );


                formData.append(
                    "file",
                    audioFile
                );


                try {

                    setUploadingFile(true);


                    /*
                        Voice message should appear
                        at the bottom.
                    */

                    shouldScrollToBottomRef.current =
                        "smooth";


                    const response =
                        await API.post(
                            "/messages/upload",
                            formData,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`
                                }
                            }
                        );


                    console.log(
                        "Voice upload response:",
                        response.data
                    );


                    const uploadedMessage =
                        response.data.data;


                    setMessages(
                        (previousMessages) => {

                            const alreadyExists =
                                previousMessages.some(
                                    (msg) =>
                                        String(
                                            msg._id
                                        ) ===
                                        String(
                                            uploadedMessage
                                                ._id
                                        )
                                );


                            if (
                                alreadyExists
                            ) {

                                return previousMessages;
                            }


                            return [
                                ...previousMessages,
                                uploadedMessage
                            ];
                        }
                    );

                } catch (error) {

                    console.error(
                        "Voice upload error:",
                        error.response?.data ||
                        error.message
                    );

                    shouldScrollToBottomRef.current =
                        false;

                } finally {

                    setUploadingFile(
                        false
                    );

                    setIsRecording(
                        false
                    );

                    setRecordingTime(
                        0
                    );

                    audioChunksRef.current =
                        [];

                    mediaRecorderRef.current =
                        null;
                }
            };


        recorder.stop();
    };


    // =====================================================
    // MAIN SEND FUNCTION
    // =====================================================

    const handleSend = async () => {

        if (!selectedUser) {
            return;
        }

        // FILES HAVE PRIORITY

        if (selectedFiles.length > 0) {

            await uploadFiles(
                selectedFiles
            );

            return;
        }

        // TEXT MESSAGE

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
                    hour:
                        "2-digit",

                    minute:
                        "2-digit"
                }
            );
        };


    // =====================================================
    // FORMAT RECORDING TIME
    // =====================================================

    const formatRecordingTime =
        (seconds) => {

            const minutes =
                Math.floor(
                    seconds / 60
                );


            const remainingSeconds =
                seconds % 60;


            return `${String(
                minutes
            ).padStart(
                2,
                "0"
            )}:${String(
                remainingSeconds
            ).padStart(
                2,
                "0"
            )}`;
        };


    // =====================================================
    // RENDER FILE MESSAGE
    // =====================================================

    const renderFileMessage =
        (msg) => {

            const fileUrl =
                `${BASE_URL}${msg.fileUrl}`;


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
            // AUDIO / VOICE
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
                                key={
                                    item._id
                                }
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
                    ref={
                        messagesContainerRef
                    }
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
                                        key={
                                            msg._id
                                        }
                                        className={
                                            isMyMessage
                                                ? "message-row my-message"
                                                : "message-row"
                                        }
                                    >

                                        <div className="message-bubble">


                                            {/* FILE / MEDIA */}

                                            {isFileMessage ? (

                                                renderFileMessage(
                                                    msg
                                                )

                                            ) : (

                                                <span>

                                                    {msg.message}

                                                </span>

                                            )}


                                            {/* MESSAGE META */}

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


                    {/* =================================================
                        IMPORTANT:
                        THIS MUST STAY AFTER messages.map()
                    ================================================= */}

                    <div
                        ref={
                            messagesEndRef
                        }
                    ></div>

                </div>


                {/* =================================================
                    MESSAGE INPUT
                ================================================= */}

                {selectedUser && (

                    <>

                        {/* SELECTED FILE PREVIEW */}

                        {/* SELECTED FILES PREVIEW */}

                        {selectedFiles.length > 0 && (

                            <div className="selected-files-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px 20px', backgroundColor: '#f0f2f5' }}>

                                {selectedFiles.map((file, index) => (

                                    <div key={index} className="selected-file-preview" style={{ margin: 0 }}>

                                        <div className="selected-file-info">

                                            <i className="bi bi-file-earmark"></i>

                                            <span title={file.name}>

                                                {file.name.length > 15 ? file.name.substring(0, 15) + "..." : file.name}

                                            </span>

                                        </div>


                                        <button
                                            type="button"
                                            className="remove-file-button"
                                            onClick={
                                                () => handleRemoveSelectedFile(index)
                                            }
                                        >

                                            <i className="bi bi-x-lg"></i>

                                        </button>

                                    </div>

                                ))}

                            </div>
                        )}


                        {/* INPUT AREA */}

                        <div className="message-input-container">

                            {!isRecording ? (

                                <>

                                    {/* ATTACHMENT */}

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
                                        multiple
                                        className="hidden-file-input"
                                        onChange={
                                            handleFileChange
                                        }
                                    />


                                    {/* TEXT INPUT */}

                                    <input
                                        type="text"
                                        placeholder={
                                            uploadingFile
                                                ? "Uploading file..."
                                                : selectedFiles.length > 0
                                                    ? "Click send to share files..."
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


                                    {/* VOICE / SEND BUTTON */}

                                    {!message.trim() &&
                                    selectedFiles.length === 0 ? (

                                        <button
                                            type="button"
                                            className="voice-button"
                                            onClick={
                                                startRecording
                                            }
                                            disabled={
                                                uploadingFile
                                            }
                                            title="Record voice"
                                        >

                                            <i className="bi bi-mic-fill"></i>

                                        </button>

                                    ) : (

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
                                                    selectedFiles.length === 0
                                                )
                                            }
                                        >

                                            {uploadingFile ? (

                                                <i className="bi bi-arrow-repeat"></i>

                                            ) : (

                                                <i className="bi bi-send-fill"></i>

                                            )}

                                        </button>
                                    )}

                                </>

                            ) : (

                                /* =================================================
                                   RECORDING UI
                                ================================================= */

                                <div className="recording-container">


                                    {/* DELETE */}

                                    <button
                                        type="button"
                                        className="delete-recording-button"
                                        onClick={
                                            deleteRecording
                                        }
                                        title="Delete recording"
                                    >

                                        <i className="bi bi-trash3-fill"></i>

                                    </button>


                                    {/* RECORDING STATUS */}

                                    <div className="recording-status">

                                        <span className="recording-dot"></span>

                                        <span>

                                            {formatRecordingTime(
                                                recordingTime
                                            )}

                                        </span>

                                        <span className="recording-text">

                                            Recording...

                                        </span>

                                    </div>


                                    {/* SEND */}

                                    <button
                                        type="button"
                                        className="send-recording-button"
                                        onClick={
                                            sendRecording
                                        }
                                        title="Send voice message"
                                    >

                                        <i className="bi bi-send-fill"></i>

                                    </button>

                                </div>
                            )}

                        </div>

                    </>
                )}

            </div>

        </div>
    );
};


export default Chat;

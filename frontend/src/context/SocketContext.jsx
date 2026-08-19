import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import { io } from "socket.io-client";


const SocketContext =
    createContext(null);


export const SocketProvider =
    ({ children }) => {

        const [socket, setSocket] =
            useState(null);


        useEffect(() => {

            const token =
                localStorage.getItem("token");


            // No login
            if (!token) {

                return;
            }


            // =================================================
            // CREATE SOCKET CONNECTION
            // =================================================

            const newSocket =
                io(
                    "http://localhost:5000",
                    {
                        auth: {
                            token
                        }
                    }
                );


            newSocket.on(
                "connect",
                () => {

                    console.log(
                        "Socket connected:",
                        newSocket.id
                    );
                }
            );


            newSocket.on(
                "connect_error",
                (error) => {

                    console.error(
                        "Socket connection error:",
                        error.message
                    );
                }
            );


            newSocket.on(
                "disconnect",
                () => {

                    console.log(
                        "Socket disconnected"
                    );
                }
            );


            setSocket(
                newSocket
            );


            // =================================================
            // CLEANUP
            // =================================================

            return () => {

                newSocket.disconnect();

            };

        }, []);


        return (

            <SocketContext.Provider
                value={{
                    socket
                }}
            >

                {children}

            </SocketContext.Provider>
        );
    };


export const useSocket =
    () => {

        return useContext(
            SocketContext
        );
    };
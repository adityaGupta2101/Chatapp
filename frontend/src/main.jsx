import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "./index.css";
import "./App.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { SocketProvider } from "./context/SocketContext";


ReactDOM.createRoot(
    document.getElementById("root")
).render(

    <React.StrictMode>

        <SocketProvider>

            <App />

        </SocketProvider>

    </React.StrictMode>
);
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Chat from "./pages/Chat";


// Protected Route
const ProtectedRoute = ({ children }) => {

    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};


const App = () => {

    return (

        <BrowserRouter>

            <Routes>

                {/* Default */}
                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />


                {/* Signup */}
                <Route
                    path="/signup"
                    element={<Signup />}
                />


                {/* Login */}
                <Route
                    path="/login"
                    element={<Login />}
                />


                {/* Protected Chat */}
                <Route
                    path="/chat"
                    element={
                        <ProtectedRoute>
                            <Chat />
                        </ProtectedRoute>
                    }
                />


                {/* Unknown URL */}
                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />

            </Routes>

        </BrowserRouter>

    );
};

export default App;
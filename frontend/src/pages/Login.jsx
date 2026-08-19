import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");

    const handleLogin = async (e) => {

        e.preventDefault();

        setError("");

        try {

            const response = await axios.post(
                "http://localhost:5000/api/auth/login",
                {
                    email,
                    password
                }
            );

            console.log("Login response:", response.data);


            // Save JWT
            localStorage.setItem(
                "token",
                response.data.token
            );


            // Save logged-in user
            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );


            // Go to Chat
            navigate("/chat");


        } catch (error) {

            console.error(
                "Login error:",
                error.response?.data || error.message
            );

            setError(
                error.response?.data?.message ||
                "Login failed"
            );

        }
    };


    return (

        <div>

            <h2>Login</h2>

            {error && (
                <p>{error}</p>
            )}

            <form onSubmit={handleLogin}>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) =>
                        setEmail(e.target.value)
                    }
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) =>
                        setPassword(e.target.value)
                    }
                />

                <button type="submit">
                    Login
                </button>

            </form>


            <p>
                Don't have an account?{" "}
                <Link to="/signup">
                    Signup
                </Link>
            </p>

        </div>
    );
};

export default Login;
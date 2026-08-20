import { useState } from "react";
import axios from "axios";
import { registerUser } from "../services/api";
import { useNavigate, Link } from "react-router-dom";

const Signup = () => {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await registerUser(
                {
                    name,
                    email,
                    password
                }
            );

            console.log("Signup response:", response.data);

            // Signup successful
            // Directly go to Login page
            navigate("/login");

        } catch (error) {

            console.error(
                "Signup error:",
                error.response?.data || error.message
            );

            setError(
                error.response?.data?.message ||
                "Signup failed"
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            <div className="auth-card">

                <h2>Create Account</h2>

                <p className="auth-subtitle">
                    Join our chat application
                </p>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup}>

                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Creating Account..." : "Signup"}
                    </button>

                </form>

                <p className="auth-footer">
                    Already have an account?{" "}
                    <Link to="/login">
                        Login
                    </Link>
                </p>

            </div>

        </div>
    );
};

export default Signup;
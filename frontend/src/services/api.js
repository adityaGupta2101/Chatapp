import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api"
});

export const registerUser = (userData) => {
    return API.post("/auth/register", userData);
};

export const loginUser = (userData) => {
    return API.post("/auth/login", userData);
};

export default API;
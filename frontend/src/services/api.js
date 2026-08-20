import axios from "axios";

export const BASE_URL = "http://localhost:5001";

const API = axios.create({
    baseURL: `${BASE_URL}/api`
});

export const registerUser = (userData) => {
    return API.post("/auth/register", userData);
};

export const loginUser = (userData) => {
    return API.post("/auth/login", userData);
};

export default API;
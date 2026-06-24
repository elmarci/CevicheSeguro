import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = window.__ceviche_token__;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

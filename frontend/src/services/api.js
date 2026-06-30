import axios from "axios";

const BASE_URL = "https://cevicheseguro-production.up.railway.app";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = window.__ceviche_token__;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

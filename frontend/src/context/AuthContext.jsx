import React, { createContext, useContext, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);

  function setAuth(tokenValue, usuarioData) {
    window.__ceviche_token__ = tokenValue;
    setToken(tokenValue);
    setUsuario(usuarioData);
  }

  function logout() {
    window.__ceviche_token__ = null;
    setToken(null);
    setUsuario(null);
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    setAuth(res.data.access_token, res.data.usuario);
    return res.data.usuario;
  }

  async function register(nombre, email, password, rol) {
    const res = await api.post("/auth/register", { nombre, email, password, rol });
    setAuth(res.data.access_token, res.data.usuario);
    return res.data.usuario;
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

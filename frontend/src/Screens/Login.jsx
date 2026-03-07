import React, { useState } from "react";
import { loginUser } from "../api/authService";
import { useNavigate } from "react-router-dom";

const Login = () => {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    try {

      const data = await loginUser(username, password);

      localStorage.setItem("token", data.access_token);

      navigate("/");

    } catch (err) {

      setError(err.message);

    }
  };

  return (
    <div>

      <h2>Login</h2>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <form onSubmit={handleSubmit}>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>

      </form>

    </div>
  );
};

export default Login;
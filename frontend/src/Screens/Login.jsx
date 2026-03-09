import React, { useState } from "react";
import { loginUser } from "../api/authService";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";

import email_icon from "../assets/email.png";
import password_icon from "../assets/password.png";
import google_icon from "../assets/google_icon_logo.png"; 

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
     
      setError(err.message || "An error occurred during login.");
    }
  };

  // placeholder function for Google login
  const handleGoogleLogin = () => {
    alert("Google login clicked!");
    // implement OAuth logic later
  };

  return (
    <div className="container">

      {/* Header */}
      <div className="header">
        <div className="text">Login</div>
        <div className="underline"></div>
      </div>

      {/* Error message display */}
      {error && (
        <div
          style={{
            color: "red",
            fontWeight: "bold",
            textAlign: "center",
            marginTop: "10px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="inputs">

          {/* Username input */}
          <div className="input">
            <img src={email_icon} alt="" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password input */}
          <div className="input">
            <img src={password_icon} alt="" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

        </div>

        {/* Login button */}
        <div className="submit-container">
          <button className="submit" type="submit">
            Login
          </button>
        </div>

        {/* Google login */}
        <div className="google-signup">
          <button
            type="button"
            className="submit google-btn"
            onClick={handleGoogleLogin}
          >
            <img src={google_icon} alt="Google" className="google-icon" />
            <span>Sign in with Google</span>
          </button>
        </div>

        {/* Don't have an account link */}
        <div className="login-redirect">
          Don’t have an account?{" "}
          <span className="login-link" onClick={() => navigate("/signup")}>
            Sign Up
          </span>
        </div>

      </form>
    </div>
  );
};

export default Login;
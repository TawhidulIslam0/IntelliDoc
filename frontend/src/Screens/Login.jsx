/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useContext } from "react";
import { loginUser } from "../api/authService";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";

// Icons
import user_icon from "../assets/person.png";
import password_icon from "../assets/password.png";
import google_icon from "../assets/google_icon_logo.png"; 

// Import ProfileContext
import { ProfileContext } from "../UI/ProfileContext";

const API_BASE = import.meta.env.VITE_API_URL;

const Login = () => {
  // Local state for inputs and error messages
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 

  const navigate = useNavigate();
  
  //  Destructure refreshProfiles from the context
  const { refreshProfiles } = useContext(ProfileContext); 

  // Check if token exists and validate user session
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const validateToken = async () => {
      try {
       const res = await fetch(`${API_BASE}/api/users/me`,{
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem("token"); // invalid token, clear it
          return;
        }

        // Token valid, navigate to dashboard
        navigate("/dashboard");
      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
      }
    };

    validateToken();
  }, [navigate]);

  // Handle form submission for login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // clear previous errors

    try {
      const data = await loginUser(username, password);

      // Save token in localStorage
      localStorage.setItem("token", data.access_token);

      //  ProfileContext fetch profiles after login to ensure we have the latest profiles for the user
      if (refreshProfiles) {
        await refreshProfiles();
      }

      // Navigate to dashboard after successful login
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "An error occurred during login.");
    }
  };

  const handleGoogleLogin = () => {
  window.location.href = `${API_BASE}/api/auth/google/login`;
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
            <img src={user_icon} alt="User" />
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
            <img src={password_icon} alt="Password" />
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
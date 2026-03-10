import React, { useState, useEffect } from "react";
import { signupUser } from "../api/authService";
import { useNavigate } from "react-router-dom";
import "./LoginSignup.css";

import user_icon from "../assets/person.png";
import email_icon from "../assets/email.png";
import password_icon from "../assets/password.png";
import google_icon from "../assets/google_icon_logo.png"; 

const Signup = () => {

  // State for inputs, errors, loading
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false); 

  const navigate = useNavigate();

  // Redirect logged-in users away from signup
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard"); // send directly to dashboard
    }
  }, [navigate]);

  // Handle signup submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    setLoading(true);

    try {
      await signupUser(username, email, password); 

      // Redirect to login after successful signup
      navigate("/login"); 
    } catch (err) {
      setError(err.message || "Signup failed"); 
    } finally {
      setLoading(false); 
    }
  };

  // placeholder function for Google signup
  const handleGoogleSignup = () => {
    alert("Google signup clicked!");
    // implement OAuth logic later
  };

  return (
    <div className="container">

      {/* Header */}
      <div className="header">
        <div className="text">Sign Up</div>
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
            <img src={user_icon} alt="" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Email input */}
          <div className="input">
            <img src={email_icon} alt="" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

        {/* Main Sign Up button */}
        <div className="submit-container">
          <button className="submit" type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </div>

        {/* Sign up with Google */}
        <div className="google-signup">
          <button
            type="button"
            className="submit google-btn"
            onClick={handleGoogleSignup}
          >
            <img src={google_icon} alt="Google" className="google-icon" />
            <span>Sign up with Google</span>
          </button>
        </div>

        {/* Already a user link */}
        <div className="login-redirect">
          Already a user?{" "}
          <span className="login-link" onClick={() => navigate("/login")}>
            Login
          </span>
        </div>

      </form>
    </div>
  );
};

export default Signup;
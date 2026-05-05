const API_BASE = import.meta.env.VITE_API_URL;

// SIGNUP
export const signupUser = async (username, email, password) => {
  const response = await fetch(`${API_BASE}/api/users/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Signup failed");
  }

  return response.json();
};


// LOGIN 
export const loginUser = async (username, password) => {
  const formData = new FormData();

  formData.append("username", username);
  formData.append("password", password);

  const response = await fetch(`${API_BASE}/api/users/login`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Login failed");
  }

  return response.json();
};
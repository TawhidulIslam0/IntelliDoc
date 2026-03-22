import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function OAuthSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");

    if (token) {
      // Store token
      localStorage.setItem("token", token);

      // Redirect to dashboard
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [params, navigate]);

  return (
    <div style={{ padding: 40 }}>
      Logging you in with Google...
    </div>
  );
}
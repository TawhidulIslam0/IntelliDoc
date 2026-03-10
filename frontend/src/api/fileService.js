import axios from "axios";

const API_URL = "http://localhost:8000";

export const uploadFile = async (file) => {
  const formData = new FormData();

  formData.append("file", file);

  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${API_URL}/files/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
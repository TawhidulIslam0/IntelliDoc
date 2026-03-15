const API_URL = "http://localhost:8000/api";

//Fetch folders for the current user
export const getFolders = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/folders/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fetch folders error:", errorText);
    throw new Error("Failed to fetch folders");
  }

  return response.json();
};


//Create a new folder
export const createFolder = async (name, parentId = null) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/folders/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      parent_id: parentId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Create folder error:", errorText);
    throw new Error("Failed to create folder");
  }

  return response.json();
};

//Delete a folder
export const deleteFolder = async (folderId) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/folders/${folderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Delete folder error:", errorText);
    throw new Error("Failed to delete folder");
  }

  return true;
};

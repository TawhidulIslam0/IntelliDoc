const API_URL = import.meta.env.VITE_API_URL + "/api/trash";

//  Get everything currently in the bin
export const getTrashItems = async (profileId) => {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_URL}/?profile_id=${profileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch trash");
  return response.json();
};

// Restore an item 
export const restoreItem = async (itemId, type) => {
  const token = localStorage.getItem("token");
  const segment = type === "folder" ? "folders" : "files";
  const response = await fetch(`${API_URL}/${segment}/${itemId}/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// Permanent Delete 
export const permanentDelete = async (itemId, type) => {
  const token = localStorage.getItem("token");
  const segment = type === "folder" ? "folders" : "files";
  const response = await fetch(`${API_URL}/${segment}/${itemId}/permanent`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok;
};
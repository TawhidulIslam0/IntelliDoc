# IntelliDoc - Frontend 

Web application for IntelliDoc

**Created by:** Tawhidul Islam, Mark Kim, Brinta Kundu, and Jia Jun Wu

---

## Features

*   **📂 Intelligent File Management**
    *   Create native Word idoc documents directly in the browser.
    *   Upload, Download, and Delete files.
    *   Hierarchical folder management for deep organization.
*   **👤 Profile-Based Organization**
    *   Switch between **Personal**, **School**, and **Work** profiles to keep your documents categorized.
*   **🔍 AI-Powered Semantic Search**
    *   Search by meaning and context rather than just keywords using vector embeddings.
    *   View relevant document snippets directly in the search results.
*   **🔐 Secure Access**
    *   Integrated Google OAuth for quick and secure user authentication.
*   **📝 Integrated Editor**
    *   A custom toolbar and editor interface for wrriting documents.

---

## Tech Stack

*   **Core Framework:** React
*   **Build Tool:** Vite
*   **Language:** JavaScript
*   **Styling:** CSS3 (including custom UI components and Print styles)
*   **State Management:** ProfileContext (React Context API)

---

### Setup & Installation

#### Option 1: Using Docker (Recommended)
This is the fastest way to get the environment running with all dependencies pre-configured.
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/your-repo.git
    cd your-repo
    ```
2.  **Open in VS Code:**
    ```bash
    code .
    ```
3.  **Launch Dev Container:**
    * VS Code will detect the `.devcontainer` folder.
    * Click **"Reopen in Container"** when the prompt appears.
    * The system will automatically build the image and install all dependencies.

#### Option 2: Local Manual Setup
1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the development server:**
    ```bash
    npm run dev -- --open
    ```
    The application will be accessible at http://localhost:5173.

---

## Project Structure
```text
frontend/
├── public/                 # Static assets (e.g., vite.svg)
└── src/
    ├── api/                # API Service Layer for backend communication
    │   ├── authService.js      # Handles authentication requests
    │   ├── fileService.js      # Manages file-related operations
    │   ├── folderService.js    # Manages folder-related operations
    │   └── trashService.js     # Handles deleted item recovery and cleanup
    ├── assets/             # Global images and static resources
    ├── auth/               # Authentication logic and route protection
    │   └── ProtectedRoute.jsx  # Higher-order component for secure routes
    ├── Screens/            # High-level page components
    │   ├── Dashboard.jsx       # Main document explorer and workspace
    │   ├── Login.jsx           # User sign-in screen
    │   ├── LoginSignup.css     # Styling for authentication screens
    │   ├── OAuthSuccess.jsx    # Redirect handler for Google OAuth
    │   └── Signup.jsx          # User registration screen
    ├── UI/                 # Reusable interface components
    │   ├── ContextMenu.jsx     # Custom right-click interaction menus
    │   ├── DashboardNavbar.jsx # Navigation specifically for the dashboard
    │   ├── Editor.jsx          # Document editing engine
    │   ├── EditorNavbar.jsx    # Navigation and actions for the document editor
    │   ├── EditorPage.jsx      # Page layout for document editing
    │   ├── FileProgressBar.jsx # Visual feedback for file uploads/processing
    │   ├── FileUploader.jsx    # File drag-and-drop/selection component
    │   ├── Print.css           # Print-specific styling for documents
    │   ├── ProfileContext.jsx  # State management for user profiles
    │   ├── Sidebar.jsx         # Primary navigation and profile switching
    │   └── Toolbar.jsx         # Document formatting and action tools
    ├── App.jsx             # Main routing and application structure
    ├── index.css           # Global application styles
    └── main.jsx            # Application entry point and DOM mounting


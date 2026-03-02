## IntelliDoc
IntelliDoc is an AI-powered document management system that enables semantic search over files. 
Instead of relying on file names or exact keywords, IntelliDoc understands the meaning of documents using vector embeddings, allowing users to retrieve files based on context.

Created by Tawhidul Islam, Mark Kim, Brinta Kandu, and Wu Jia Jun 

# Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running  
  - Enable **WSL 2** if on Windows
- [VS Code](https://code.visualstudio.com/) installed  
- VS Code extensions (will auto-install in container):
  - Python
  - Docker
  - Prettier
  - ESLint

## First-Time Setup (After Cloning)

1. **Clone the repository**

```bash
git clone https://github.com/your-org/your-repo.git
cd your-repo
```
2. **Open in VSCode**
```bash
code .
```

3. **Open in dev container**
- VS Code will detect .devcontainer folder
- Click Reopen in Container when prompted
- This will:
  - Build the Docker image (Python + Node + dependencies)
  - Start PostgreSQL and backend container
  - Mount your repo into the container
  - Automatically install frontend dependencies

## Backend setup

1. **Database Connection**
  - FastAPI connects to PostgreSQL via:
```bash
DATABASE_URL = "postgresql://postgres:postgres@db:5432/appdb"
```

2. **Start FastAPI server**
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Frontend setup

1. **Run React / Vite dev server**
```bash
cd frontend
npm run dev -- --host
```


##  Features

###  File Management
- Create Word documents (primary focus)
- Upload / Download / Delete files
- Folder management (hierarchical structure)
- Profile-based organization:
  - Personal
  - School
  - Work
- Google OAuth authentication

##  AI-Powered Semantic Search
- Extracts text from:
  - PDF
  - DOCX
  - TXT
- Splits documents into chunks
- Generates vector embeddings
- Stores embeddings in PostgreSQL using pgvector
- Performs similarity search using cosine distance
- Returns relevant documents with contextual snippets

## Tech Stack
### Frontend
- React
- Vite
- JavaScript

### Backend
- FastAPI
- Python
- SQLAlchemy
- Alembic

### Database
- PostgreSQL
- pgvector

### Storage
- AWS S3 (or Local Storage)

### Machine Learning
- OpenAI Embeddings (or HuggingFace Sentence Transformers)
- PyPDF / pdfplumber
- python-docx

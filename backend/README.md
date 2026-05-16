# IntelliDoc - Backend 

Flask API server powering IntelliDoc

**Created by:** Tawhidul Islam, Mark Kim, Brinta Kundu, and Jia Jun Wu	

---

## Features

* **📂 Intelligent Document Processing**
    * Text extraction from PDF, DOCX, and TXT files.
    * Smart document chunking for optimized vector search.
* **🧠 AI-Powered Semantic Search**
    * Generates 1536-dimensional vector embeddings to analyze file context.
    * Uses **pgvector** to retrieve relevant documents based on meaning rather than keywords.
* **🔐 Secure Authentication**
    * Hybrid auth system supporting standard native credentials and Google OAuth.

---

## Tech Stack

* **Core Framework:** FastAPI (Python)
* **ORM:** SQLAlchemy
* **Migrations:** Alembic
* **Database:** PostgreSQL + **pgvector**
* **Libraries:** PyPDF, python-docx

---

### Backend development setup

1.  **Database Connection**
    * FastAPI connects to PostgreSQL via:
    ```bash
    DATABASE_URL = "postgresql://postgres:postgres@db:5432/appdb"
    ```

2.  **Start FastAPI server program**
    ```bash
    cd backend
    fastapi dev --host 0.0.0.0
    ```

---

## Database & Migrations

We use **Alembic** to manage database schemas and track version history cleanly.

* **Apply existing migrations:**
    ```bash
    alembic upgrade head
    ```
* **Generate a new migration:**
    ```bash
    alembic revision --autogenerate -m "describe your changes"
    ```

---

## Project Structure
```text
backend/
├── alembic/                        # Database migration environment
│   ├── versions/                   # Chronological migration history scripts
│   │   ├── 5526c2da807e_initial_schema.py
│   │   ├── 8e2f4a1b0c9d_add_soft_delete.py
│   │   ├── 9a7cae16f10e_add_tab_id_to_chunks.py
│   │   └── f39c310b0956_add_chunk_fields_to_files.py
│   ├── env.py                      # Alembic script configuring the migration context
│   ├── README                      # Documentation for migrations
│   └── script.py.mako              # Template for generating new migration scripts
├── app/                            # Core application source directory
│   ├── api/                        # API endpoint definitions and modular routes
│   │   ├── __init__.py             # Initializes the API module package
│   │   ├── auth.py                 # Native user registration, login, and token management
│   │   ├── export.py               # File conversion and document exporting workflows
│   │   ├── files.py                # File CRUD, multi-format text extraction, and processing
│   │   ├── folders.py              # Hierarchical folder management and workspace sorting
│   │   ├── google_auth.py          # Google OAuth2 identity validation and authentication
│   │   ├── profile.py              # Workspace categorization (Work/School/Personal) settings
│   │   ├── tabs.py                 # UI state management and dashboard layout persistence
│   │   ├── trash.py                # Soft-delete tracking, item purging, and file recovery
│   │   └── users.py                # User demographic updates and profile metadata handling
│   ├── models/                     # SQLAlchemy database models mapping to PostgreSQL
│   │   ├── __init__.py             # Exposes SQLAlchemy base and registers system models
│   │   ├── chunk.py                # Schema for parsed vector text chunks
│   │   ├── file.py                 # File metadata and relationship configurations
│   │   ├── folder.py               # Hierarchical nested tracking for user directories
│   │   ├── profile.py              # Defines structural profiles (School/Work/Personal)
│   │   ├── tab.py                  # Active UI exploration state configurations
│   │   ├── upload_chunk.py         # Multi-part chunked file uploading cache tracker
│   │   └── user.py                 # Core user accounts and authentication credentials storage
│   └── services/                   # Business logic, text processing, and AI execution
│       ├── Buddhist Response #1.docx # Seed reference document for text processing validation
│       ├── Buddhist Response #1.pdf  # Seed reference PDF file used for system validation
│       ├── Favorite Books.txt      # Text format example file for local semantic testing
│       ├── chunker.py              # Text segmenting logic for optimal vector storage
│       ├── embedder.py             # Generates vectors through high-dimensional embedding APIs
│       ├── indexer.py              # Updates vector listings inside the relational schema
│       ├── semantic_search.py      # Executes similarity math and vector searching logic
│       ├── test.py                 # Sandbox environment for service execution validation
│       └── text_extractor.py       # Handles document reading across variable formats
├── chunking.py                     # Contextual logic configuring global text separation
├── database.py                     # Instantiates SQLAlchemy engine and session pooling
├── main.py                         # FastAPI server bootstrap configuration and initialization
├── text_extraction.py              # Helper utility handling multi-format parsing pipelines
├── .dockerignore                   # Specifies files excluded from the container context
├── Dockerfile                      # Builds the integrated FastAPI server container image
└── alembic.ini                     # Global database migration settings config file

FROM mcr.microsoft.com/devcontainers/python:3.12

# For the app image, we use the Python 3.12 image as the base image, which includes Python and pip pre-installed. We also install Node.js, which is required for the frontend development.
# The Dockerfile performs the following steps:    
# 1. It starts with the base image for Python 3.12.
# 2. It installs Node.js
# 4. It sets the working directory to /workspace, which is where the application code will be located.
# 5. It copies the requirements.txt file from the backend directory to the /tmp directory in the container and installs the Python dependencies listed in that file using pip.

# Install Node 
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /workspace

# Install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt


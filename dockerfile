FROM python:3.11-slim

# Set working directory
WORKDIR /code

# Copy the backend directory
COPY ./backend /code/backend

# Install dependencies
WORKDIR /code/backend
RUN pip install --no-cache-dir -r requirements.txt

# Set the correct Python path
ENV PYTHONPATH=/code

# Command to run the application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]

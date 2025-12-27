FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgdal-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY app.py .

# Create directories
RUN mkdir -p /app/uploads /app/models

# Expose port (HF Spaces uses 7860)
EXPOSE 7860

# Run
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]

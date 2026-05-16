FROM python:3.11-slim

WORKDIR /app

# System deps for shell execution and Docker CLI
RUN apt-get update && apt-get install -y \
    curl \
    git \
    docker.io \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data/workspace

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
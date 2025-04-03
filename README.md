## Document Analyzer RAG

A Retrieval-Augmented Generation (RAG) application that processes PDF documents and provides intelligent responses using Mistral AI.

 ## Features

- PDF document ingestion and processing
- Text chunking and vector embeddings
- Vector store for efficient retrieval
- Mistral AI integration for response generation
- FastAPI-based REST API


## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory with your Mistral AI API key:
```
MISTRAL_API_KEY=your_api_key_here
```

4. Run the application:
```bash
uvicorn main:app --reload
```

## API Endpoints

- `POST /upload`: Upload PDF documents
- - `POST /list-documents`: Query the document collection
- `POST /query`: Query the document collection

## Usage

1. Upload PDF documents using the `/upload` endpoint
2. Send queries to the `/query` endpoint to get responses based on the uploaded documents

## Environment Variables

- `MISTRAL_API_KEY`: Your Mistral AI API key #

import hashlib
import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
# from langchain.llms import OpenAI
from langchain.chains import RetrievalQA
from typing import List
from dotenv import load_dotenv
from pdf_processor import PDFProcessor
from vector_store import VectorStore
from mistralai.client import MistralClient

# Create a wrapper for MistralAI to use with LangChain
from langchain.llms.base import LLM
from typing import Any, Dict, List, Mapping, Optional
from langchain.callbacks.manager import CallbackManagerForLLMRun
from pydantic import BaseModel
from mistralai.models.chat_completion import ChatMessage

from langchain.schema import Document
from datetime import datetime

# Load environment variables
load_dotenv()

app = FastAPI(title="Document Analyzer RAG")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
pdf_processor = PDFProcessor()
vector_store = VectorStore()

# Initialize Mistral AI
# mistral_api_key = os.getenv("MISTRAL_API_KEY")
mistral_api_key = "mBaX8nyDl9LyoHxkEknMAXu8bE6BJpXf"
if not mistral_api_key:
    raise ValueError("MISTRAL_API_KEY environment variable is not set")

class QueryRequest(BaseModel):
    query: str


class MistralAIWrapper(LLM):
    client: Any
    model_name: str = "mistral-tiny"
    
    def __init__(self, api_key: str, model_name: str = "mistral-tiny"):
        super().__init__()
        self.client = MistralClient(api_key=api_key)
        self.model_name = model_name
    
    @property
    def _llm_type(self) -> str:
        return "mistral-ai"
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        # try:
        # Send request to Mistral API
        print(prompt, "---------------Inside LLM Call--------------------------")
        messages = [ 
                    ChatMessage(role="user", content=prompt) 
                    ]
        response = self.client.chat(
            model=self.model_name,
            # messages=[{"role": "user", "content": prompt}],
            messages = messages
        )

        # Debug information
        print(f"Response type: {type(response)}")
        print(response, "-----------------------------------------")

        # Handle different response formats
        try:
            # First try the dictionary approach
            if isinstance(response, dict):
                if 'choices' in response and len(response['choices']) > 0:
                    choice = response['choices'][0]
                    if 'message' in choice and 'content' in choice['message']:
                        return choice['message']['content']
            
            # Try object attribute approach
            elif hasattr(response, 'choices') and len(response.choices) > 0:
                choice = response.choices[0]
                if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                    return choice.message.content
            
            # For newer Mistral API versions that might use model_dump
            elif hasattr(response, 'model_dump'):
                response_dict = response.model_dump()
                if 'choices' in response_dict and len(response_dict['choices']) > 0:
                    content = response_dict['choices'][0]['message']['content']
                    return content
                    
            # Last resort - convert to string
            return str(response)
            
        except Exception as e:
            print(f"Error processing response: {str(e)}")
            # Return the raw response as string to avoid breaking your application
            return f"Error processing LLM response: {str(e)}"
        

llm = MistralAIWrapper(api_key=mistral_api_key, model_name="mistral-tiny")

# # Store document metadata for tracking purposes
document_registry = {}

@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload PDF documents and process them."""
    try:
        # Create a temporary directory to store uploaded files
        with tempfile.TemporaryDirectory() as temp_dir:
            for file in files:
                if not file.filename.endswith('.pdf'):
                    raise HTTPException(status_code=400, detail="Only PDF files are allowed")
                
                # Save the uploaded file
                file_path = os.path.join(temp_dir, file.filename)
                with open(file_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                # Process the PDF
                chunks = pdf_processor.process_pdf(file_path)
                
                # Register document in our tracking system
                doc_id = hashlib.md5(file.filename.encode()).hexdigest()
                document_registry[doc_id] = {
                    "filename": file.filename,
                    "upload_time": str(datetime.now()),
                    "chunks": len(chunks)
                }
                
                vector_store.add_documents(chunks)
        
        return {"message": f"Successfully processed {len(files)} files"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/list-documents")
async def list_documents():
    """List all PDF documents saved in the database."""
    try:
        # Return the list of documents from our registry
        if document_registry:
            return {
                "documents": [
                    {
                        "id": doc_id,
                        "filename": info["filename"],
                        "upload_time": info["upload_time"],
                        "chunks": info["chunks"]
                    }
                    for doc_id, info in document_registry.items()
                ]
            }
        else:
            # Try to get available documents from vector store if registry is empty
            try:
                all_docs = vector_store.vectorstore.get()
                unique_sources = set()
                for doc in all_docs.get("documents", []):
                    if "source" in doc["metadata"]:
                        unique_sources.add(doc["metadata"]["source"])
                
                return {
                    "documents": [
                        {"filename": os.path.basename(source), "source": source}
                        for source in unique_sources
                    ]
                }
            except:
                return {"documents": [], "message": "No documents found in vector store"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/query")
async def query_documents(request: QueryRequest):
    """Query the document collection."""
    
    try:
        # Retrieve documents
        docs = vector_store.similarity_search(request.query)
        if not docs:
            return {"response": "No relevant documents found. Please upload documents first."}
            
        print("Found relevant documents")
        
        # Create context from retrieved documents
        context = "\n\n".join([doc.page_content for doc in docs])

  
        try:
             # Creating a proper RAG prompt that includes both context and question
            prompt = f"""
            Answer the following question based on this context:

            Context:
            {context}

            Question: {request.query}

            Answer:
            """
            
            direct_response = llm._call(prompt)
            return {"response": direct_response}
        
        
        except Exception as llm_error:
            print(f"LLM call error: {str(llm_error)}")
            return {"response": f"Error generating response. Please try again later.", "error": str(llm_error)}
    
    except Exception as e:
        print(f"Error in query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    

@app.post("/clear")
async def clear_documents():
    """Clear all documents from the vector store."""
    try:
        vector_store.clear()
        return {"message": "Successfully cleared all documents"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint that redirects to docs or provides API info."""
    return {
        "message": "Document Analyzer RAG API",
        "endpoints": {
            "POST /upload": "Upload PDF documents",
            "POST /query": "Query the document collection",
            "POST /clear": "Clear all documents",
            "GET /docs": "API documentation"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
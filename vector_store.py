from typing import List
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
import os
from mistralai.client import MistralClient
from mistralai.models.embeddings import EmbeddingObject
from langchain.embeddings.base import Embeddings

class MistralEmbeddings(Embeddings):
    client: MistralClient
    model_name: str = "mistral-embed"
    
    def __init__(self, api_key: str, model_name: str = "mistral-embed"):
        self.client = MistralClient(api_key=api_key)
        self.model_name = model_name
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed documents using Mistral API."""
        embeddings = self.client.embeddings(
            model=self.model_name,
            input=texts,
        )
        return [data.embedding for data in embeddings.data]
    
    def embed_query(self, text: str) -> List[float]:
        """Embed query using Mistral API."""
        embeddings = self.client.embeddings(
            model=self.model_name,
            input=[text],
        )
        return embeddings.data[0].embedding



class VectorStore:
    def __init__(self, persist_directory: str = "chroma_db"):
        self.persist_directory = persist_directory
        
        # Get Mistral API key
        mistral_api_key = "mBaX8nyDl9LyoHxkEknMAXu8bE6BJpXf"
        # mistral_api_key = os.getenv("MISTRAL_API_KEY")
        
        # Use Mistral embeddings
        self.embeddings = MistralEmbeddings(api_key=mistral_api_key)
        
        self.vectorstore = Chroma(
            persist_directory=persist_directory,
            embedding_function=self.embeddings
        )

    def add_documents(self, documents: List[Document]):
        """Add documents to the vector store."""
        self.vectorstore.add_documents(documents)
        self.vectorstore.persist()

    def similarity_search(self, query: str, k: int = 4) -> List[Document]:
        """Search for similar documents."""
        return self.vectorstore.similarity_search(query, k=k)

    def clear(self):
        """Clear the vector store."""
        if os.path.exists(self.persist_directory):
            import shutil
            shutil.rmtree(self.persist_directory)
        self.vectorstore = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        ) 
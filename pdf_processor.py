from typing import List
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import os
import json

# Document registry file
REGISTRY_FILE = "document_registry.json"

# Load existing registry on startup
document_registry = {}
try:
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, "r") as f:
            document_registry = json.load(f)
except Exception as e:
    print(f"Error loading document registry: {e}")

def save_registry():
    """Save registry to file"""
    try:
        with open(REGISTRY_FILE, "w") as f:
            json.dump(document_registry, f)
    except Exception as e:
        print(f"Error saving registry: {e}")

class PDFProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )

    def process_pdf(self, pdf_path: str) -> List[Document]:
        """Process a single PDF file and return chunks."""
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        chunks = self.text_splitter.split_documents(pages)
        return chunks

    def process_directory(self, directory_path: str) -> List[Document]:
        """Process all PDF files in a directory and return combined chunks."""
        all_chunks = []
        for filename in os.listdir(directory_path):
            if filename.endswith('.pdf'):
                pdf_path = os.path.join(directory_path, filename)
                chunks = self.process_pdf(pdf_path)
                all_chunks.extend(chunks)
        return all_chunks 
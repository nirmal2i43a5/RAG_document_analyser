document.addEventListener('DOMContentLoaded', function() {
    // API URL Configuration
    const API_URL = window.location.origin;
    console.log(API_URL);
    
    // DOM Elements - Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    // DOM Elements - Upload
    const uploadForm = document.getElementById('uploadForm');
    const pdfFilesInput = document.getElementById('pdfFiles');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadLoading = document.getElementById('uploadLoading');
    const browseBtn = document.getElementById('browseBtn');
    const filesList = document.getElementById('filesList');
    
    // DOM Elements - Documents
    const documentsList = document.getElementById('documentsList');
    const clearBtn = document.getElementById('clearBtn');
    
    // DOM Elements - Chat
    const queryInput = document.getElementById('queryInput');
    const queryBtn = document.getElementById('queryBtn');
    const queryLoading = document.getElementById('queryLoading');
    const chatHistory = document.getElementById('chatHistory');
    
    // DOM Elements - Modal
    let documentModal;
    try {
        documentModal = new bootstrap.Modal(document.getElementById('documentModal'));
    } catch (error) {
        console.error('Error initializing modal:', error);
    }
    const docFilename = document.getElementById('docFilename');
    const docUploadTime = document.getElementById('docUploadTime');
    const docChunks = document.getElementById('docChunks');
    const docId = document.getElementById('docId');
    
    // Show loading spinner
    function showLoading(loadingEl) {
        loadingEl.style.display = 'inline-block';
    }
    
    // Hide loading spinner
    function hideLoading(loadingEl) {
        loadingEl.style.display = 'none';
    }
    
    // Display error message
    function showError(message) {
        alert(`Error: ${message}`);
    }
    
    // Navigation
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.add('section-hidden');
        });
        document.getElementById(sectionId).classList.remove('section-hidden');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if(link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
    }
    
    // Add a message to chat history
    function addChatMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        
        // Use marked.js to render markdown for bot messages
        if (!isUser) {
            messageDiv.innerHTML = marked.parse(message);
        } else {
            messageDiv.textContent = message;
        }
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    // Show document details in modal
    function showDocumentDetails(doc) {
        if (!docFilename || !docUploadTime || !docChunks || !docId || !documentModal) {
            console.error('Modal elements not found');
            alert('Could not show document details: UI elements not found.');
            return;
        }
        
        docFilename.textContent = doc.filename;
        docUploadTime.textContent = new Date(doc.upload_time).toLocaleString();
        docChunks.textContent = doc.chunks;
        docId.textContent = doc.id;
        
        try {
            documentModal.show();
        } catch (error) {
            console.error('Error showing modal:', error);
            alert('Document Details: ' + doc.filename + ' - ' + doc.chunks + ' chunks');
        }
    }
    
    // Update files list in upload form
    function updateFilesList() {
        filesList.innerHTML = '';
        
        if (pdfFilesInput.files.length > 0) {
            const filesHeader = document.createElement('h6');
            filesHeader.textContent = 'Selected Files:';
            filesList.appendChild(filesHeader);
            
            const fileList = document.createElement('ul');
            fileList.className = 'list-group';
            
            for (let i = 0; i < pdfFilesInput.files.length; i++) {
                const file = pdfFilesInput.files[i];
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                listItem.innerHTML = `
                    <span><i class="bi bi-file-earmark-pdf text-danger me-2"></i>${file.name}</span>
                    <span class="badge bg-secondary rounded-pill">${formatFileSize(file.size)}</span>
                `;
                fileList.appendChild(listItem);
            }
            
            filesList.appendChild(fileList);
            uploadBtn.disabled = false;
        } else {
            uploadBtn.disabled = true;
        }
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    // Fetch and display documents list
    async function fetchDocuments() {
        try {
            const response = await fetch(`${API_URL}/list-documents`);
            const data = await response.json();
            console.log(response,"------------------------");
            if (data.documents && data.documents.length > 0) {
                documentsList.innerHTML = '';
                data.documents.forEach(doc => {
                    const colDiv = document.createElement('div');
                    colDiv.className = 'col-md-6 col-lg-4 mb-4';
                    
                    const card = document.createElement('div');
                    card.className = 'card document-card h-100';
                    card.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title text-truncate" title="${doc.filename}">
                                <i class="bi bi-file-earmark-pdf text-danger me-2"></i>${doc.filename}
                            </h5>
                            <p class="card-text text-muted small">
                                Uploaded: ${new Date(doc.upload_time).toLocaleString()}
                            </p>
                            <p class="card-text">
                                <span class="badge bg-primary">${doc.chunks} chunks</span>
                            </p>
                            <div class="mt-3 d-flex justify-content-between">
                                <button class="btn btn-sm btn-outline-primary view-doc-btn">
                                    <i class="bi bi-eye"></i> View
                                </button>
                                <button class="btn btn-sm btn-outline-secondary details-doc-btn">
                                    <i class="bi bi-info-circle"></i> Details
                                </button>
                            </div>
                        </div>
                    `;
                    
                    // Add event listeners for the buttons
                    colDiv.appendChild(card);
                    documentsList.appendChild(colDiv);
                    
                    // Add click events after the card is in the DOM
                    const viewBtn = colDiv.querySelector('.view-doc-btn');
                    const detailsBtn = colDiv.querySelector('.details-doc-btn');
                    
                    // View button opens the PDF directly
                    viewBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent card click
                        // Use a direct URL with document ID to ensure the PDF extension is shown in browser
                        const pdfUrl = `${API_URL}/document/${doc.id}`;
                        console.log("Opening PDF at URL:", pdfUrl);
                        window.open(pdfUrl, '_blank');
                    });
                    
                    // Details button opens the modal
                    detailsBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent card click
                        showDocumentDetails(doc);
                    });
                    
                    // Card click defaults to view
                    card.addEventListener('click', () => {
                        window.open(`${API_URL}/document/${doc.id}`, '_blank');
                    });
                });
            } else {
                documentsList.innerHTML = `
                    <div class="col-12 text-center text-muted py-5">
                        <i class="bi bi-inbox fs-1"></i>
                        <p class="mt-3">No documents uploaded yet</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            documentsList.innerHTML = `
                <div class="col-12 text-center text-danger py-5">
                    <i class="bi bi-exclamation-triangle fs-1"></i>
                    <p class="mt-3">Failed to load documents</p>
                </div>
            `;
        }
    }
    
    // Upload documents
    async function uploadDocuments(files) {
        // Create FormData
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        try {
            showLoading(uploadLoading);
            console.log('Uploading to:', `${API_URL}/upload`);
            console.log('Number of files:', files.length);
            
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            
            console.log('Upload response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Upload success:', data);
            alert(`Success: ${data.message}`);
            
            // Reset file input
            pdfFilesInput.value = '';
            filesList.innerHTML = '';
            uploadBtn.disabled = true;
            
            // Switch to chat section
            showSection('chatSection');
            
            // Refresh documents list
            fetchDocuments();
        } catch (error) {
            console.error('Upload error details:', error);
            showError('Failed to upload documents: ' + error.message);
        } finally {
            hideLoading(uploadLoading);
        }
    }
    
    // Clear all documents
    async function clearDocuments() {
        if (!confirm('Are you sure you want to clear all documents?')) return;
        
        try {
            const response = await fetch(`${API_URL}/clear`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            alert(`Success: ${data.message}`);
            
            // Clear chat history except the first welcome message
            while (chatHistory.childNodes.length > 1) {
                chatHistory.removeChild(chatHistory.lastChild);
            }
            
            // Refresh documents list
            fetchDocuments();
        } catch (error) {
            showError('Failed to clear documents: ' + error.message);
        }
    }
    
    // Query documents
    async function queryDocuments(query) {
        if (!query.trim()) {
            alert('Please enter a question');
            return;
        }
        
        // Add user message to chat
        addChatMessage(query, true);
        
        try {
            showLoading(queryLoading);
            
            // Create a request with structured formatting instructions
            const requestBody = {
                query: query,
                formatting_instructions: `
                    Please format your response with clear structure:
                    1. Use markdown headings (# for main headings, ## for subheadings)
                    2. Use bullet points (- or *) for lists
                    3. Use numbered lists (1., 2., etc.) for sequential steps
                    4. **Bold** important terms or key concepts
                    5. Add horizontal rules (---) to separate main sections
                    6. Use code blocks for examples where relevant
                    7. Include a brief summary at the end if appropriate
                `
            };
            
            const response = await fetch(`${API_URL}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            // Add bot response to chat
            addChatMessage(data.response);
            
            // Clear input
            queryInput.value = '';
        } catch (error) {
            console.error('Query error:', error);
            // Add error message to chat
            addChatMessage(`Error: ${error.message}. Please try again.`);
        } finally {
            hideLoading(queryLoading);
        }
    }
    
    // Event listeners - Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);
        });
    });
    
    // Event listeners - Upload
    browseBtn.addEventListener('click', function(e) {
        e.preventDefault();
        pdfFilesInput.click();
    });
    
    pdfFilesInput.addEventListener('change', updateFilesList);
    
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (pdfFilesInput.files.length === 0) {
            alert('Please select at least one PDF file');
            return;
        }
        uploadDocuments(pdfFilesInput.files);
    });
    
    // Drag and drop handling
    const dropZone = document.querySelector('#uploadSection .card');
    
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropZone.classList.add('border-primary');
        }
        
        function unhighlight() {
            dropZone.classList.remove('border-primary');
        }
        
        dropZone.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            // Use FileList object with input element
            if (files.length > 0) {
                // Can't directly assign FileList to another FileList
                // Instead, add files to a FormData and process them
                updateFilesListFromDropped(files);
            }
        }
        
        // Handle files from drag and drop
        function updateFilesListFromDropped(files) {
            // Clear file input first
            pdfFilesInput.value = '';
            filesList.innerHTML = '';
            
            // Display dropped files
            if (files.length > 0) {
                const filesHeader = document.createElement('h6');
                filesHeader.textContent = 'Selected Files:';
                filesList.appendChild(filesHeader);
                
                const fileList = document.createElement('ul');
                fileList.className = 'list-group';
                
                // Store files for upload
                let validFiles = [];
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    
                    // Check if it's a PDF
                    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                        continue;
                    }
                    
                    validFiles.push(file);
                    
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    listItem.innerHTML = `
                        <span><i class="bi bi-file-earmark-pdf text-danger me-2"></i>${file.name}</span>
                        <span class="badge bg-secondary rounded-pill">${formatFileSize(file.size)}</span>
                    `;
                    fileList.appendChild(listItem);
                }
                
                if (validFiles.length > 0) {
                    filesList.appendChild(fileList);
                    uploadBtn.disabled = false;
                    
                    // Store files in a way we can access them later
                    window.droppedFiles = validFiles;
                    
                    // Override form submit to use these files
                    uploadForm.onsubmit = function(e) {
                        e.preventDefault();
                        uploadDocuments(window.droppedFiles);
                    };
                } else {
                    filesList.innerHTML = '<div class="alert alert-warning">No valid PDF files found. Please drop PDF files only.</div>';
                    uploadBtn.disabled = true;
                }
            } else {
                uploadBtn.disabled = true;
            }
        }
    }
    
    // Event listeners - Documents
    clearBtn.addEventListener('click', clearDocuments);
    
    // Event listeners - Chat
    queryBtn.addEventListener('click', function() {
        queryDocuments(queryInput.value);
    });
    
    queryInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            queryDocuments(queryInput.value);
        }
    });
    
    // Initialize
    fetchDocuments();
}); 
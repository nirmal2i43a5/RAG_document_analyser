import { useState, useRef } from 'react';
import { Box, Button, Container, Flex, Heading, Input, Text, VStack, useToast, List, ListItem } from '@chakra-ui/react';
import { uploadDocuments, queryDocuments, listDocuments, clearDocuments } from '../services/api';

export default function Home() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (files.length === 0) return;

    setLoading(true);
    try {
      await uploadDocuments(Array.from(files));
      toast({
        title: 'Documents uploaded',
        status: 'success',
        duration: 3000,
      });
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await queryDocuments(query);
      setResponse(data.response);
    } catch (error) {
      toast({
        title: 'Query failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const data = await listDocuments();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleClear = async () => {
    try {
      await clearDocuments();
      setDocuments([]);
      setResponse('');
      toast({
        title: 'Documents cleared',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Clear failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Container maxW="container.xl" py={10}>
      <Flex direction="column" gap={8}>
        <Heading as="h1">Document Analyzer RAG</Heading>
        
        <Box>
          <Heading size="md" mb={4}>Upload Documents</Heading>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".pdf"
            onChange={handleFileUpload}
          />
          <Button 
            onClick={() => fileInputRef.current.click()}
            isLoading={loading}
            colorScheme="blue"
          >
            Select PDF Files
          </Button>
        </Box>

        <Box>
          <Heading size="md" mb={4}>Documents</Heading>
          {documents.length === 0 ? (
            <Text>No documents uploaded yet</Text>
          ) : (
            <List spacing={2}>
              {documents.map((doc) => (
                <ListItem key={doc.id}>
                  {doc.filename} - {doc.chunks} chunks
                </ListItem>
              ))}
            </List>
          )}
          <Button mt={4} colorScheme="red" onClick={handleClear}>
            Clear All Documents
          </Button>
        </Box>

        <Box>
          <Heading size="md" mb={4}>Ask a Question</Heading>
          <VStack align="stretch" spacing={4}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question"
            />
            <Button 
              onClick={handleQuery}
              isLoading={loading}
              colorScheme="green"
            >
              Ask
            </Button>
          </VStack>
        </Box>

        {response && (
          <Box>
            <Heading size="md" mb={4}>Response</Heading>
            <Box p={4} borderWidth={1} borderRadius="md">
              <Text whiteSpace="pre-wrap">{response}</Text>
            </Box>
          </Box>
        )}
      </Flex>
    </Container>
  );
}
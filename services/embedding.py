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

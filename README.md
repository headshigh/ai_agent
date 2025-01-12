
access the agent with `/api/graph?q=<your question>` . It keeps searching the internet untill it finds the result.
you can ask questions about weather of a place currently , upcoming cricket mateches and other current affairs as well. It uses langgraph.js . makes use of nodes and edges i.e tavily search tool to access the web.

to access "/chat" page ,you need to have llama 3.2 running locally using `ollama run llama3.2` . it  is a chatbot that uses llama3.2 to stream the response, it can neither give results about current affairs nor can it access the web.

# Roma

Roma is an AI conversational assistant designed to support emotional 
health for Spanish-speaking adults. Deployed via WhatsApp and web.

## Stack

- Node.js + TypeScript
- Hono (web framework)
- OpenAI API

## Getting Started

1. Clone the repository
   git clone https://github.com/RenoOx/proyecto-roma.git
   cd proyecto-roma

2. Install dependencies
   npm install

3. Create a .env file in the root folder
   OPENAI_API_KEY=your_api_key_here

4. Run the project
   npm run dev

## Environment Variables

| Variable | Description |
|----------|-------------|
| OPENAI_API_KEY | Your OpenAI API key |

## API Endpoints

POST /chat
Receives a user message and returns Roma's response.

Request body:
{ "message": "Hola Roma, ¿cómo estás?" }

Response:
{ "reply": "Hola, soy Roma..." }
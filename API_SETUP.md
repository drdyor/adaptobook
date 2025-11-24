# API Key Setup

## OpenRouter API Key

To use the Grok model for text adaptation, you need to add your OpenRouter API key to your environment variables.

1. Get your API key from [OpenRouter.ai](https://openrouter.ai/)
2. Add it to your `.env` file:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

3. Optional: Set a referer URL (for OpenRouter tracking):

```bash
OPENROUTER_REFERER_URL=https://your-domain.com
```

## How It Works

- The app will use OpenRouter with Grok model if `OPENROUTER_API_KEY` is set
- Falls back to Manus Forge API if OpenRouter is not configured
- Grok model: `x-ai/grok-beta` (free tier available)

## Rate Limits

- PDF uploads: 10 per IP per day
- Text uploads: 10 per IP per day  
- Paragraph adaptations: 50 per IP per day

These limits help prevent abuse while keeping the service free.


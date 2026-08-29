---
title: "Authentication"
description: "Learn how to authenticate with the Sonderr AI Gateway using API keys, session tokens, and Bring Your Own Key (BYOK)."
---

# Authentication

The Sonderr AI Gateway supports multiple authentication methods depending on your use case.

## API key authentication

The primary authentication method is a Bearer token passed in the `Authorization` header:

```bash
Authorization: Bearer <your_api_key>
```

API keys are JWT tokens tied to your Sonderr account. See [how to get your API key](/docs/getting-started/setup-authentication#sonderr-gateway-api-key) for step-by-step instructions.

### Using your API key

{% tabs %}
{% tab label="TypeScript" %}

```typescript
import { createOpenAI } from "@ai-sdk/openai"

const sonderr = createOpenAI({
  baseURL: "https://api.kilo.ai/api/gateway",
  apiKey: process.env.SONDERR_API_KEY,
})
```

{% /tab %}
{% tab label="Python" %}

```python
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("SONDERR_API_KEY"),
    base_url="https://api.kilo.ai/api/gateway",
)
```

{% /tab %}
{% tab label="cURL" %}

```bash
curl -X POST "https://api.kilo.ai/api/gateway/chat/completions" \
  -H "Authorization: Bearer $SONDERR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "anthropic/claude-sonnet-4.5", "messages": [{"role": "user", "content": "Hello"}]}'
```

{% /tab %}
{% /tabs %}

## Organization tokens

When making requests on behalf of an organization, include the organization ID in the request header:

```
X-Sonderr-OrganizationId: your_org_id
```

Organization tokens are scoped with a 15-minute expiry and enforce the organization's policies, including model allow lists, provider restrictions, and per-user spending limits.

## Anonymous access

The gateway allows unauthenticated access for free models only. Anonymous requests are identified by IP address and are subject to rate limiting (200 requests per hour per IP).

Free models include models tagged with `:free` in their model ID, such as `minimax/minimax-m2.1:free` and `z-ai/glm-5:free`.

## Bring Your Own Key (BYOK)

BYOK lets you use your own provider API keys with the Sonderr AI Gateway. When a BYOK key is configured, requests are sent to the provider using your key. You are billed directly by the provider -- Sonderr does not add any markup.

### Supported BYOK providers

| Provider | BYOK Key ID |
|---|---|
| Anthropic | `anthropic` |
| AWS Bedrock | `bedrock` |
| Google AI Studio | `google` |
| Inception | `inception` |
| OpenAI | `openai` |
| MiniMax | `minimax` |
| Mistral | `mistral` |
| SpaceXAI | `xai` |
| Z.AI | `zai` |
| BytePlus Coding Plan | `byteplus-coding` |
| Chutes BYOK | `chutes-byok` |
| Codestral (FIM) | `codestral` |
| CrofAI | `crofai` |
| Inceptron BYOK | `inceptron-byok` |
| Kimi Code | `kimi-coding` |
| Martian | `martian` |
| Neuralwatt | `neuralwatt` |
| NVIDIA | `nvidia-byok` |
| Ollama Cloud | `ollama-cloud` |
| Sonderr Go | `sonderr-go` |
| OrcaRouter | `orcarouter` |
| Synthetic | `synthetic` |
| Xiaomi Token Plan (Europe) | `xiaomi-token-plan-ams` |
| Xiaomi Token Plan (Singapore) | `xiaomi-token-plan-sgp` |
| Z.ai Coding Plan | `zai-coding` |

### How BYOK works

1. Add your provider API key in the [Sonderr dashboard](https://app.kilo.ai) or through your Sonderr extension settings
2. Keys are encrypted at rest using AES-256 encryption
3. When you make a request for a model from that provider, the gateway automatically uses your key
4. Usage is tracked but not billed to your Sonderr balance (cost is set to $0)
5. If your BYOK key fails, the request will not automatically fall back to Sonderr's keys

BYOK keys can be configured at the personal level or at the organization level. Organization-level keys apply to all members of the organization and require owner or billing manager access to manage.

## Request headers

The gateway accepts the following headers:

| Header | Required | Description |
|---|---|---|
| `Authorization` | Yes (unless free model) | `Bearer <api_key>` |
| `Content-Type` | Yes | `application/json` |
| `X-Sonderr-OrganizationId` | No | Organization context for org-scoped requests |
| `X-Sonderr-TaskId` | No | Task identifier for prompt cache keying |
| `X-Sonderr-Version` | No | Client version string |
| `x-sonderr-mode` | No | Mode hint for `sonderr-auto` model routing |

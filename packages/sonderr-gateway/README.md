# @sonderr/sonderr-gateway

Unified Sonderr Gateway package for Sonderr providing authentication, AI provider integration, and API access.

## Features

- **Authentication**: Device authorization flow for Sonderr Gateway
- **AI Provider**: OpenRouter-based provider with Sonderr Gateway integration
- **API Integration**: Profile, balance, and model management
- **TUI Helpers**: Utilities for terminal UI components

## Installation

```bash
bun add @sonderr/sonderr-gateway
```

## Usage

### Plugin Registration

```typescript
import { SonderrAuthPlugin } from "@sonderr/sonderr-gateway"

// Register with Sonderr
const plugins = [SonderrAuthPlugin]
```

### Provider Usage

```typescript
import { createSonderr } from "@sonderr/sonderr-gateway"

const provider = createSonderr({
  sonderrToken: process.env.SONDERR_API_KEY,
  sonderrOrganizationId: "org-123",
})

const model = provider.languageModel("anthropic/claude-sonnet-4")
```

### API Access

```typescript
import { fetchProfile, fetchBalance } from "@sonderr/sonderr-gateway"

const profile = await fetchProfile(token)
const balance = await fetchBalance(token)
```

## License

MIT

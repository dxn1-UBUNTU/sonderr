---
title: "Using the Sonderr Provider"
description: "The built-in Sonderr provider gives you access to top AI models with one account. Setup and sign-in guide."
sidebar_label: Sonderr Provider
---

# Using Sonderr's Built-in Provider

Sonderr provides its own built-in API provider that gives you access to the latest frontier coding models through a simple registration process. No need to manage API keys from multiple providers - just sign up and start coding.

**Website:** [https://kilo.ai/](https://kilo.ai/)

## Getting Started

When you sign up for Sonderr, you can start immediately with free models, or add credits to your account to access premium models.

1. **Sign up:** Complete the registration process
2. **Add credits:** Top up your account at [app.kilo.ai](https://app.kilo.ai/profile)
3. **Start Coding:** Use 500+ models including the latest frontier coding models

## Registration Process

Sonderr offers a streamlined registration that connects you directly to frontier coding models:

1. **Start Registration:** Click "Try Sonderr for Free" in the extension
2. **Sign In:** Use your Google account to sign in at kilo.ai
3. **Authorize VS Code:**
   - kilo.ai will prompt you to open Visual Studio Code
   - For web-based IDEs, you'll copy the API key manually instead
4. **Complete Setup:** Allow VS Code to open the authorization URL when prompted

<!-- <img src="/img/setting-up/signupflow.gif" alt="Sign up and registration flow with Sonderr" width="600" /> -->

## Supported Models

Sonderr provides access to the latest frontier coding models through its built-in provider. The specific models available are automatically updated and managed by the Sonderr service, ensuring you always have access to the most capable models for coding tasks.

## Sonderr Gateway integration

Sonderr routes requests through the Sonderr Gateway for model access, usage tracking, and organization controls. For BYOK setup, provider routing, and full model availability, use the Gateway docs as the source of truth:

- [Sonderr Gateway overview](/docs/gateway)
- [Models & Providers](/docs/gateway/models-and-providers)
- [Authentication & BYOK](/docs/gateway/authentication)

## Configuration in Sonderr

Once you've completed the registration process, Sonderr is automatically configured:

1. **Automatic Setup:** After successful registration, Sonderr is ready to use immediately
2. **No API Key Management:** Your authentication is handled seamlessly through the registration process
3. **Model Selection:** Access to frontier models is provided automatically through your Sonderr account

## Connected Accounts

With the Sonderr provider, if you sign up with Google you can also connect other sign in accounts - like GitHub - by:

1. Go to your profile
2. Select [**Connected Accounts**](https://app.kilo.ai/connected-accounts)
3. Under "Link a New account" select the type of account to link
4. Complete the OAuth authorization, and you'll see your connected accounts!

<!-- <img src="/docs/img/sonderr-provider/connected-accounts.png" alt="Connect account screen" width="600" /> -->

## Tips and Notes

- **Free Models:** New users can start with free models to explore Sonderr's capabilities
- **Identity Verification:** The temporary hold system ensures service reliability while preventing misuse
- **Seamless Integration:** No need to manage multiple API keys or provider configurations
- **Latest Models:** Automatic access to the most current frontier coding models
- **Support Available:** Contact [hi@kilo.ai](mailto:hi@kilo.ai) for questions about pricing or tokens

For detailed setup instructions, see [Setting up Sonderr](/docs/getting-started/setup-authentication).

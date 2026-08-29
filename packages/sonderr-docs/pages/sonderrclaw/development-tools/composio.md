---
title: "Composio Integration"
description: "Connect Composio to your SonderrClaw agent to access hundreds of tool integrations"
---

# Composio Integration

{% partial file="sonderrclaw-eol.md" /%}

Connect Composio to your SonderrClaw agent to instantly unlock access to 250+ tool integrations — from Salesforce and HubSpot to Notion, Jira, and beyond. Composio is a platform that handles the authentication and connection details for each service, so your agent can use them without you having to set up each one individually.

{% callout type="info" title="Tip" %}
Browse the full list of toolkits Composio supports at [composio.dev/toolkits](https://composio.dev/toolkits). If a toolkit you need is listed there, you can connect it to SonderrClaw through Composio in minutes.
{% /callout %}

## Prerequisites

Before you begin, make sure you have:

- A **Composio account** — sign up for free at [composio.dev](https://composio.dev)
- A **SonderrClaw agent** already set up — see the [Dashboard Reference](/docs/sonderrclaw/dashboard) if you haven't done this yet

## Setup

### Step 1: Create a Composio account and get your API key

1. Go to [composio.dev](https://composio.dev) and sign up for a free account
2. Once logged in, open the **Settings** or **API Keys** section of your Composio dashboard
3. Click **Create API Key**, give it a name (for example, `sonderrclaw`), and copy the key

### Step 2: Add the API key to SonderrClaw

1. Go to the **Settings** tab on your [SonderrClaw dashboard](/docs/sonderrclaw/dashboard)
2. Scroll to the **Integrations** section and find **Composio**
3. Paste the API key into the **Composio API Key** field
4. Click **Save**
5. **Redeploy** your instance to apply the changes

### Step 3: Authenticate tools in Composio

Composio acts as a bridge between SonderrClaw and each third-party service. To allow your agent to use a specific tool, you need to authorise it once inside Composio:

1. In your Composio dashboard, go to **Integrations** or **Connected Accounts**
2. Find the tool you want (for example, Slack, Notion, or Jira)
3. Click **Connect** and follow the authentication steps for that service
4. Once connected, the tool is immediately available to your SonderrClaw agent

Repeat this for each service your agent needs to access.

## What Your Agent Can Do

Once connected, your SonderrClaw agent can use any tool you have authenticated in Composio. With 250+ integrations available, this includes:

| Category | Example tools |
|---|---|
| **Project management** | Jira, Notion, Asana, Trello, ClickUp |
| **Communication** | Slack, Discord, Microsoft Teams |
| **Development** | GitHub, GitLab, Bitbucket |
| **CRM & sales** | Salesforce, HubSpot, Pipedrive |
| **Documents & storage** | Google Drive, Dropbox, Confluence |
| **Databases** | Airtable, Supabase, PostgreSQL |

Your agent can perform actions like reading data, creating records, sending messages, and triggering workflows — all through natural language prompts.

## Related

- [Integrations Overview](/docs/sonderrclaw/development-tools)
- [GitHub Integration](/docs/sonderrclaw/development-tools/github)

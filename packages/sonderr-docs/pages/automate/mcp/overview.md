---
title: "MCP Overview"
description: "Overview of the Model Context Protocol"
---

# Model Context Protocol (MCP)

The Model Context Protocol (MCP) is a standard for extending Sonderr's capabilities by connecting to external tools and services. MCP servers provide additional tools and resources that help Sonderr accomplish tasks beyond its built-in capabilities, such as accessing databases, custom APIs, and specialized functionality.

You can install curated MCP servers from the Sonderr Marketplace. See the [Marketplace guide](/docs/customize/marketplace) to understand project and global installs, which files change, and what to review before installing.

## MCP Documentation

This documentation is organized into several sections:

- [**Using MCP in Sonderr**](using-in-sonderr-code) - Comprehensive guide to configuring, enabling, and managing MCP servers with Sonderr. Includes server settings, tool approval, and troubleshooting.

- [**MCP Tool Permissions**](using-in-sonderr-code#auto-approve-tools) - Control which MCP tools auto-approve, prompt, or are blocked entirely using the same `allow` / `ask` / `deny` permission system as built-in tools.

- [**What is MCP?**](what-is-mcp) - Clear explanation of the Model Context Protocol, its client-server architecture, and how it enables AI systems to interact with external tools.

- [**STDIO & SSE Transports**](server-transports) - Detailed comparison of local (STDIO) and remote (SSE) transport mechanisms with deployment considerations for each approach.

- [**MCP vs API**](mcp-vs-api) - Analysis of the fundamental distinction between MCP and REST APIs, explaining how they operate at different layers of abstraction for AI systems.

## Contributing to the Marketplace

Have you created an MCP server that others might find useful? Share it with the community by contributing to the [Sonderr Marketplace](https://github.com/Sonderr-Org/sonderr-marketplace)!

### How to Submit Your MCP Server

1. **Develop your server**: Create an MCP server following the [MCP specification](https://github.com/modelcontextprotocol/)
2. **Test thoroughly**: Ensure your server works correctly with Sonderr and handles edge cases gracefully
3. **Fork the marketplace repository**: Visit [github.com/Sonderr-Org/sonderr-marketplace](https://github.com/Sonderr-Org/sonderr-marketplace) and create a fork
4. **Add your server**: Include your server configuration and documentation following the repository's structure
5. **Submit a pull request**: Create a PR with a clear description of what your server does and its requirements

### Submission Guidelines

- Document all available tools and resources your server provides
- Include example configurations for both STDIO and SSE transports if applicable
- Specify any required environment variables or API keys
- Note any platform-specific requirements (Windows, macOS, Linux)
- Follow the [contribution guidelines](https://github.com/Sonderr-Org/sonderr-marketplace/blob/main/CONTRIBUTING.md) in the marketplace repository

For more details on contributing to Sonderr, see the [Contributing Guide](/docs/contributing).

#!/usr/bin/env bun

import { $ } from "bun"

await $`bun run --conditions=browser ./src/sonderr/generate-cli-docs.ts`.cwd("packages/cli")

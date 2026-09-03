---
"@sonderr/cli": minor
---

SONDERR-HIVE swarm mode: add the experimental scaffolding (gated behind `SONDERR_EXPERIMENTAL`) for multi-agent swarms. Multiple API keys per provider round-robin for throughput, a hidden inter-agent message bus the user never sees, and an orchestrator that auto- or manually spawns 1-inf concurrent subagents. Off by default in 0.0.63.

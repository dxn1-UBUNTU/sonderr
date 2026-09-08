---
"@sonderr/cli": patch
---

Fix hive sidebar not switching in hive sessions by removing the experimental flag gate from the TUI sidebar condition. The sidebar now shows based purely on the session agent being `hive` or a swarm agent.

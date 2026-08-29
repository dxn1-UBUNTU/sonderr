// @ts-nocheck

import { Sonderr } from "@sonderr/core"
import { ReadTool } from "@sonderr/core/tools"

const sonderr = Sonderr.make({})

sonderr.tool.add(ReadTool)

sonderr.tool.add({
  name: "bash",
  schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to run.",
      },
    },
    required: ["command"],
  },
  execute(input, ctx) {},
})

sonderr.auth.add({
  provider: "openai",
  type: "api",
  value: process.env.OPENAI_API_KEY,
})

sonderr.agent.add({
  name: "build",
  permissions: [],
  model: {
    id: "gpt-5-5",
    provider: "openai",
    variant: "xhigh",
  },
})

const sessionID = await sonderr.session.create({
  agent: "build",
})

sonderr.subscribe((event) => {
  console.log(event)
})

await sonderr.session.prompt({
  sessionID,
  text: "hey what is up",
})

await sonderr.session.prompt({
  sessionID,
  text: "what is up with this",
  files: [
    {
      mime: "image/png",
      uri: "data:image/png;base64,xxxx",
    },
  ],
})

await sonderr.session.wait()

console.log(await sonderr.session.messages(sessionID))

import { AgentV2 } from "@sonderr/core/agent"
import { AISDK } from "@sonderr/core/aisdk"
import { Catalog } from "@sonderr/core/catalog"
import { CommandV2 } from "@sonderr/core/command"
import { Credential } from "@sonderr/core/credential"
import { AppNodeBuilder } from "@sonderr/core/effect/app-node-builder"
import { LayerNodePlatform } from "@sonderr/core/effect/app-node-platform"
import { LayerNode } from "@sonderr/core/effect/layer-node"
import { EventV2 } from "@sonderr/core/event"
import { FileSystem } from "@sonderr/core/filesystem"
import { FSUtil } from "@sonderr/core/fs-util"
import { Integration } from "@sonderr/core/integration"
import { Location } from "@sonderr/core/location"
import { Npm } from "@sonderr/core/npm"
import { PluginV2 } from "@sonderr/core/plugin"
import { Reference } from "@sonderr/core/reference"
import { SkillV2 } from "@sonderr/core/skill"
import { Global } from "@sonderr/core/global"
import { Effect, Layer } from "effect"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { tempLocationLayer } from "../fixture/location"

// sonderr_change - Credential imports Global.data/auth.json on startup, so without this the suite
// reads the developer's real credential store and its results depend on whether they are logged in.
const globalLayer = Global.layerWith({ data: fs.mkdtempSync(path.join(os.tmpdir(), "sonderr-plugin-test-")) })

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: () => Effect.succeed({ directory: "", entrypoint: undefined }),
    install: () => Effect.void,
    which: () => Effect.succeed(undefined),
  }),
)

export const PluginTestLayer = AppNodeBuilder.build(
  LayerNode.group([
    FileSystem.node,
    FSUtil.node,
    Location.node,
    Npm.node,
    Credential.node,
    EventV2.node,
    LayerNodePlatform.httpClient,
    PluginV2.node,
    AgentV2.node,
    AISDK.node,
    Catalog.node,
    CommandV2.node,
    Integration.node,
    Reference.node,
    SkillV2.node,
  ]),
  [
    [Location.node, tempLocationLayer],
    [Npm.node, npmLayer],
    [Global.node, globalLayer], // sonderr_change
  ],
)

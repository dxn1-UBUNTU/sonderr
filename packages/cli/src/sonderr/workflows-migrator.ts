import * as fs from "fs/promises"
import * as path from "path"
import os from "os"
import type { ConfigCommandV1 } from "@sonderr/core/v1/config/command"
import { InvalidError } from "@sonderr/core/v1/config/error"
import { Filesystem } from "../util/filesystem"
import { SonderrMarkdown } from "./config/markdown"
import { SonderrPaths } from "./paths"

export namespace WorkflowsMigrator {
  const home = () => process.env.HOME || process.env.USERPROFILE || os.homedir()

  // .sonderr first (lower precedence), .sonderr second (higher precedence / wins)
  const SONDERR_WORKFLOWS_DIRS = [".sonderr/workflows", ".sonderr/workflows"]
  const globalWorkflowsDirs = () => [
    path.join(home(), ".sonderr", "workflows"),
    path.join(home(), ".sonderr", "workflows"),
  ]

  export interface SonderrWorkflow {
    name: string
    path: string
    content: string
    source: "global" | "project"
  }

  export interface MigrationResult {
    commands: Record<string, ConfigCommandV1.Info>
    warnings: string[]
  }

  async function findWorkflowFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    return entries.filter((e) => e.isFile() && e.name.endsWith(".md")).map((e) => path.join(dir, e.name))
  }

  export function extractNameFromFilename(filename: string): string {
    return path.basename(filename, ".md")
  }

  export function extractDescription(content: string): string | undefined {
    const lines = content.split("\n")
    let foundTitle = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith("#")) {
        foundTitle = true
        continue
      }
      if (foundTitle && trimmed.length > 0) {
        return trimmed.slice(0, 200)
      }
    }
    return undefined
  }

  async function loadWorkflowsFromDir(
    dir: string,
    source: "global" | "project",
    root?: string,
    warnings: string[] = [],
  ): Promise<SonderrWorkflow[]> {
    if (!(await Filesystem.isDir(dir))) return []
    const files = await findWorkflowFiles(dir)
    const workflows: SonderrWorkflow[] = []
    for (const file of files) {
      const options = {
        trusted: source === "global",
        fileScope: source === "project" && root ? { root, source: file } : undefined,
      }
      const content = await SonderrMarkdown.read(file, options)
        .then((text) => SonderrMarkdown.substitute(text, file, options))
        .catch((err) => {
          const message = InvalidError.isInstance(err) ? err.data.message : undefined
          warnings.push(
            `Skipped workflow '${extractNameFromFilename(file)}': ${message ?? (err instanceof Error ? err.message : String(err))}`,
          )
          return undefined
        })
      if (content === undefined) continue
      workflows.push({
        name: extractNameFromFilename(file),
        path: file,
        content: content.trim(),
        source,
      })
    }
    return workflows
  }

  export async function discoverWorkflows(
    projectDir: string,
    skipGlobalPaths?: boolean,
    warnings: string[] = [],
  ): Promise<SonderrWorkflow[]> {
    const workflows: SonderrWorkflow[] = []

    if (!skipGlobalPaths) {
      // 1. VSCode extension global storage (primary location for global workflows)
      const vscodeWorkflowsDir = path.join(SonderrPaths.vscodeGlobalStorage(), "workflows")
      workflows.push(...(await loadWorkflowsFromDir(vscodeWorkflowsDir, "global", undefined, warnings)))

      // 2. Home directories ~/.sonderr/workflows and ~/.sonderr/workflows
      for (const dir of globalWorkflowsDirs()) {
        workflows.push(...(await loadWorkflowsFromDir(dir, "global", undefined, warnings)))
      }
    }

    // 3. Project workflows (.sonderr/workflows/ and .sonderr/workflows/)
    for (const dir of SONDERR_WORKFLOWS_DIRS) {
      workflows.push(...(await loadWorkflowsFromDir(path.join(projectDir, dir), "project", projectDir, warnings)))
    }

    return workflows
  }

  export function convertToCommand(workflow: SonderrWorkflow): ConfigCommandV1.Info {
    return {
      template: workflow.content,
      description: extractDescription(workflow.content) ?? `Workflow: ${workflow.name}`,
    }
  }

  export async function migrate(options: {
    projectDir: string
    /** Skip reading from global paths. Used for testing. */
    skipGlobalPaths?: boolean
  }): Promise<MigrationResult> {
    const warnings: string[] = []
    const commands: Record<string, ConfigCommandV1.Info> = {}

    const workflows = await discoverWorkflows(options.projectDir, options.skipGlobalPaths, warnings)

    // Deduplicate by name (project takes precedence over global)
    const workflowsByName = new Map<string, SonderrWorkflow>()

    // Add global first
    for (const workflow of workflows.filter((w) => w.source === "global")) {
      workflowsByName.set(workflow.name, workflow)
    }

    // Project overwrites global
    for (const workflow of workflows.filter((w) => w.source === "project")) {
      if (workflowsByName.has(workflow.name)) {
        warnings.push(`Project workflow '${workflow.name}' overrides global workflow`)
      }
      workflowsByName.set(workflow.name, workflow)
    }

    // Convert to commands
    for (const [name, workflow] of workflowsByName) {
      commands[name] = convertToCommand(workflow)
    }

    return { commands, warnings }
  }
}

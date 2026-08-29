#!/usr/bin/env bun
/**
 * Configuration for upstream merge automation
 */

export interface PackageMapping {
  from: string
  to: string
}

export interface MergeConfig {
  /** Package name mappings from sonderr to sonderr */
  packageMappings: PackageMapping[]

  /** Files to always keep Sonderr's version (never take upstream changes) */
  keepOurs: string[]

  /** Files to skip entirely (don't add from upstream, remove if added) */
  skipFiles: string[]

  /** Files that should take upstream version and apply Sonderr branding transforms */
  takeTheirsAndTransform: string[]

  /** Script files with GitHub API references */
  scriptFiles: string[]

  /** Extension files (Zed, etc.) */
  extensionFiles: string[]

  /** Web/docs files */
  webFiles: string[]

  /** Lock files to accept ours and regenerate after merge */
  lockFiles: string[]

  /** Directories that are Sonderr-specific and should be preserved */
  sonderrDirectories: string[]

  /** File patterns to exclude from codemods */
  excludePatterns: string[]

  /** Default branch to merge into */
  baseBranch: string

  /** Branch prefix for merge branches */
  branchPrefix: string

  /** Remote name for upstream */
  upstreamRemote: string

  /** Remote name for origin */
  originRemote: string

  /** i18n file patterns that need string transformation */
  i18nPatterns: string[]
}

export const defaultConfig: MergeConfig = {
  packageMappings: [
    { from: "sonderr-ai", to: "@sonderr/cli" },
    { from: "@sonderr/cli", to: "@sonderr/cli" },
    { from: "@sonderr/sdk", to: "@sonderr/sdk" },
    { from: "@sonderr/plugin", to: "@sonderr/plugin" },
  ],

  keepOurs: [
    "README.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "PRIVACY.md",
    "SECURITY.md",
    "AGENTS.md",
    // GitHub workflows - MANUAL REVIEW (can break CI/CD)
    ".github/workflows/publish.yml",
    ".github/workflows/close-stale-prs.yml",
    ".github/pull_request_template.md",
    // Sonderr-specific command files
    ".sonderr/command/commit.md",
    // Sonderr-specific publish scripts
    "packages/cli/script/publish-registries.ts",
    // Generated OpenAPI spec - kept ours and regenerated post-merge via script/generate.ts
    "packages/sdk/openapi.json",
    // GitHub Action - Sonderr version is fully ported and complete
    "github/action.yml",
    "github/README.md",
    "github/script/release",
    "github/script/publish",
  ],

  // Files that only exist in upstream and should NOT be added to Sonderr
  // These are removed during merge if they appear
  skipFiles: [
    // Translated README files (Sonderr doesn't have these)
    "README.ar.md",
    "README.bn.md",
    "README.br.md",
    "README.bs.md",
    "README.da.md",
    "README.de.md",
    "README.es.md",
    "README.fr.md",
    "README.gr.md",
    "README.it.md",
    "README.ja.md",
    "README.ko.md",
    "README.no.md",
    "README.pl.md",
    "README.ru.md",
    "README.th.md",
    "README.tr.md",
    "README.uk.md",
    "README.vi.md",
    "README.zh.md",
    "README.zht.md",
    // Stats file
    "STATS.md",
    // Team members file (Sonderr doesn't maintain this upstream list)
    ".github/TEAM_MEMBERS",
    // Workflows that don't exist in Sonderr
    ".github/workflows/update-nix-hashes.yml",
    ".github/workflows/deploy.yml",
    ".github/workflows/docs-update.yml",
    ".github/workflows/docs-locale-sync.yml",
    // Workflows deleted in Sonderr (replaced or no longer needed)
    ".github/workflows/close-prs.yml",
    ".github/workflows/sonderr.yml",
    ".github/workflows/publish-vscode.yml",
    // Upstream PR cleanup is replaced by .github/workflows/sonderr-auto-close.yml
    "script/github/close-prs.ts",
    // VS Code example configs (Sonderr ships real .vscode/* files)
    ".vscode/launch.example.json",
    ".vscode/settings.example.json",
    // Nix files for packages Sonderr has removed / replaced with nix/sonderr.nix
    "nix/desktop.nix",
    "nix/sonderr.nix",
    // sonderr CLI bin (Sonderr uses its own build output)
    "packages/cli/bin/sonderr",
    // Sonderr does not ship upstream's embedded web UI command.
    "packages/cli/src/cli/cmd/web.ts",
    // Removed prompt file
    "packages/cli/src/session/prompt/build-switch.txt",
    // Upstream app translation automation targets products and binaries Sonderr does not ship
    "script/translate-app.ts",
    "script/translate-app.test.ts",
    "script/translate-app.md",
    // Vouch files (Sonderr doesn't use Vouch).
    // Upstream currently ships VOUCHED.td (typo extension). The glob covers both
    // the current .td file and any future .md rename without another merge breaking.
    ".github/VOUCHED.*",
    ".github/workflows/vouch-check-issue.yml",
    ".github/workflows/vouch-check-pr.yml",
    ".github/workflows/vouch-manage-by-issue.yml",
    // SST infrastructure files (Sonderr is CLI-only, no hosted platform)
    "sst.config.ts",
    "sst-env.d.ts",
    // Hosted platform packages (not needed for CLI)
    "infra/**",
    "packages/console/**",
    "packages/enterprise/**",
    "packages/web/**",
    "packages/slack/**",
    "packages/function/**",
    "packages/docs/**",
    "packages/identity/**",
    "packages/app/**",
    "packages/desktop/**",
    "packages/desktop-electron/**",
    "packages/cli/**",
    "packages/stats/**",
    "sdks/vscode/**",
    // GitHub Action - Sonderr version is fully ported and complete
    "github/index.ts",
    "github/package.json",
    "github/tsconfig.json",
    "github/bun.lock",
    "github/sst-env.d.ts",
    "github/.gitignore",
  ],

  // Files that should take upstream version and apply Sonderr branding transforms
  // These are files with only branding differences, no logic changes
  takeTheirsAndTransform: [
    // Model-facing prompts that need Sonderr product identity and documentation links
    "packages/cli/src/session/prompt/meta.txt",
    // UI components
    "packages/ui/src/components/**/*.tsx",
    "packages/ui/src/context/**/*.tsx",
  ],

  // Script files with GitHub API references
  scriptFiles: ["script/*.ts", "packages/cli/script/*.ts"],

  // Extension files
  extensionFiles: ["packages/extensions/**/*"],

  // Web/docs files
  webFiles: [],

  // Lock files and generated files to accept ours and regenerate after merge
  // Note: nix/hashes.json is regenerated by CI (update-nix-hashes.yml), not locally
  lockFiles: [
    "bun.lock",
    "**/bun.lock",
    "package-lock.json",
    "**/package-lock.json",
    "yarn.lock",
    "**/yarn.lock",
    "pnpm-lock.yaml",
    "**/pnpm-lock.yaml",
    "Cargo.lock",
    "**/Cargo.lock",
    "nix/hashes.json",
  ],

  sonderrDirectories: [
    "packages/cli/src/sonderr",
    "packages/cli/test/sonderr",
    "packages/sonderr-gateway",
    "packages/sonderr-telemetry",
    "packages/sonderr-vscode",
    "packages/sonderr-jetbrains",
    "packages/sonderr-ui",
    "packages/sonderr-docs",
    "packages/sonderr-i18n",
    "script/upstream",
  ],

  excludePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/bun.lock",
    "**/package-lock.json",
    "**/yarn.lock",
  ],

  baseBranch: "main",
  branchPrefix: "upstream-merge",
  upstreamRemote: "upstream",
  originRemote: "origin",

  // i18n translation files that need Sonderr branding transforms
  i18nPatterns: ["packages/*/src/i18n/*.ts"],
}

export function loadConfig(overrides?: Partial<MergeConfig>): MergeConfig {
  return { ...defaultConfig, ...overrides }
}

export function resolveBaseBranch(base: string | undefined, current: string): string | undefined {
  if (base !== "HEAD") return base
  if (current === "HEAD") throw new Error("--base-branch HEAD requires a named branch, but git is in detached HEAD")
  return current
}

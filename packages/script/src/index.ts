import { $ } from "bun"
import semver from "semver"
import path from "path"

const rootPkgPath = path.resolve(import.meta.dir, "../../../package.json")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}
// sonderr_change start
const env = {
  SONDERR_CHANNEL: process.env["SONDERR_CHANNEL"],
  SONDERR_BUMP: process.env["SONDERR_BUMP"],
  SONDERR_VERSION: process.env["SONDERR_VERSION"],
  SONDERR_RELEASE: process.env["SONDERR_RELEASE"],
  SONDERR_PRE_RELEASE: process.env["SONDERR_PRE_RELEASE"],
}
// sonderr_change end
const CHANNEL = await (async () => {
  if (env.SONDERR_CHANNEL) return env.SONDERR_CHANNEL // sonderr_change
  // sonderr_change start - publish to "rc" channel for pre-releases
  if (env.SONDERR_PRE_RELEASE === "true") return "rc"
  // sonderr_change end
  if (env.SONDERR_BUMP) return "latest" // sonderr_change
  if (env.SONDERR_VERSION && !env.SONDERR_VERSION.startsWith("0.0.0-")) return "latest" // sonderr_change
  return await $`git branch --show-current`.text().then((x) => x.trim().replace(/[^0-9A-Za-z-]/g, "-")) // sonderr_change
})()
const IS_PREVIEW = CHANNEL !== "latest"

// sonderr_change start - shared helpers for version computation
function parseVersion(input: string) {
  const match = input.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    value: `${match[1]}.${match[2]}.${match[3]}`,
  }
}

function compareVersion(
  a: NonNullable<ReturnType<typeof parseVersion>>,
  b: NonNullable<ReturnType<typeof parseVersion>>,
) {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

async function fetchLatest() {
  const data: any = await fetch("https://registry.npmjs.org/@sonderr/cli/latest").then((res) => {
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  })
  return data.version as string
}

async function fetchHighest() {
  if (!process.env.GH_REPO) return fetchLatest()
  const data: { tagName: string }[] = await $`gh release list --json tagName --limit 100 --repo ${process.env.GH_REPO}`
    .json()
    .catch(() => [])
  const versions = data.flatMap((item) => {
    const version = parseVersion(item.tagName)
    if (!version) return []
    return [version]
  })
  const highest = versions.sort(compareVersion).at(-1)
  if (highest) return highest.value
  return fetchLatest()
}

function bumpVersion(current: string, type: string) {
  const version = parseVersion(current)
  if (!version) throw new Error(`Invalid version: ${current}`)
  if (type === "major") return `${version.major + 1}.0.0`
  if (type === "minor") return `${version.major}.${version.minor + 1}.0`
  return `${version.major}.${version.minor}.${version.patch + 1}`
}
// sonderr_change end

const VERSION = await (async () => {
  if (env.SONDERR_VERSION) return env.SONDERR_VERSION
  if (IS_PREVIEW) {
    // sonderr_change start - rc releases use plain semver required by VS Code Marketplace
    if (env.SONDERR_BUMP && env.SONDERR_PRE_RELEASE === "true") {
      const current = await fetchHighest()
      return bumpVersion(current, env.SONDERR_BUMP.toLowerCase())
    }
    // sonderr_change end
    return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
  }
  const version = await fetchHighest() // sonderr_change
  return bumpVersion(version, env.SONDERR_BUMP?.toLowerCase() ?? "patch") // sonderr_change
})()

// sonderr_change start
const team = [
  "actions-user",
  "alexkgold",
  "arimesser",
  "arkadiykondrashov",
  "bturcotte520",
  "chrarnoldus",
  "codingelves",
  "dependabot[bot]",
  "dosire",
  "Drixled",
  "DScdng",
  "emilieschario",
  "eshurakov",
  "evanjacobson",
  "Helix-Sonderr",
  "iscekic",
  "jeanduplessis",
  "jobrietbergen",
  "johnnyeric",
  "jrf0110",
  "sonderr-code-bot",
  "sonderr-code-bot[bot]",
  "sonderr-maintainer[bot]",
  "sonderr-bot",
  "sonderrconnect-lite[bot]",
  "sonderrconnect[bot]",
  "kirillk",
  "lambertjosh",
  "marius-sonderr",
  "olearycrew",
  "pandemicsyn",
  "pedroheyerdahl",
  "RSO",
  "sbreitenother",
  "St0rmz1",
  "suhailkc2025",
]
// sonderr_change end

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
  get release(): boolean {
    return !!env.SONDERR_RELEASE
  },
  get team() {
    return team
  },
}
console.log(`sonderr script`, JSON.stringify(Script, null, 2)) // sonderr_change

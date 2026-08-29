export const Npm = {
  name: "@sonderr/cli",
  path: "@sonderr%2fcli",
}

export const Brew = {
  name: "sonderr",
  tap: "Sonderr-Org/tap",
  formula: "Sonderr-Org/tap/sonderr",
  api: "https://formulae.brew.sh/api/formula/sonderr.json",
}

export const Choco = {
  name: "sonderr",
  api: "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27sonderr%27%20and%20IsLatestVersion&$select=Version",
}

export const Scoop = {
  name: "sonderr",
  manifest: "https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/sonderr.json",
}

export const Release = {
  install: "https://kilo.ai/cli/install",
}

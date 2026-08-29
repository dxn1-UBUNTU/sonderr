export function model(extra?: NodeJS.ProcessEnv | null): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries({ ...process.env, ...(extra ?? {}) }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  )
  delete env.SONDERR_SERVER_PASSWORD
  delete env.SONDERR_SERVER_USERNAME
  delete env.SONDERR_CONFIG
  delete env.SONDERR_CONFIG_CONTENT
  delete env.SONDERR_CONFIG_DIR
  return env
}

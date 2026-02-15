import path from "path"
import { copyDir, ensureDir, writeText } from "../utils/files"
import type { QoderBundle } from "../types/qoder"

export async function writeQoderBundle(outputRoot: string, bundle: QoderBundle): Promise<void> {
  const paths = resolveQoderPaths(outputRoot)

  // Write agents to ~/.qoder/agents/{name}.md
  if (bundle.agents.length > 0) {
    await ensureDir(paths.agentsDir)
    for (const agent of bundle.agents) {
      await writeText(path.join(paths.agentsDir, `${agent.name}.md`), agent.content + "\n")
    }
  }

  // Write commands to ~/.qoder/commands/{name}.md
  if (bundle.commands.length > 0) {
    await ensureDir(paths.commandsDir)
    for (const command of bundle.commands) {
      await writeText(path.join(paths.commandsDir, `${command.name}.md`), command.content + "\n")
    }
  }

  // Copy skill directories to ~/.qoder/skills/{name}/
  if (bundle.skillDirs.length > 0) {
    await ensureDir(paths.skillsDir)
    for (const skill of bundle.skillDirs) {
      await copyDir(skill.sourceDir, path.join(paths.skillsDir, skill.name))
    }
  }
}

function resolveQoderPaths(outputRoot: string) {
  const base = path.basename(outputRoot)
  // If already pointing at .qoder, write directly into it
  if (base === ".qoder") {
    return {
      qoderDir: outputRoot,
      agentsDir: path.join(outputRoot, "agents"),
      commandsDir: path.join(outputRoot, "commands"),
      skillsDir: path.join(outputRoot, "skills"),
    }
  }
  // Otherwise nest under .qoder
  return {
    qoderDir: path.join(outputRoot, ".qoder"),
    agentsDir: path.join(outputRoot, ".qoder", "agents"),
    commandsDir: path.join(outputRoot, ".qoder", "commands"),
    skillsDir: path.join(outputRoot, ".qoder", "skills"),
  }
}

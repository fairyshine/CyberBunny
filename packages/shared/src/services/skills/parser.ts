/**
 * SKILL.md parser — parse frontmatter + body from SKILL.md content
 * Follows the agentskills.io specification
 */

export interface SkillMetadata {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  allowedTools?: string;
  metadata?: Record<string, string>;
}

export interface ParsedSkill {
  frontmatter: SkillMetadata;
  body: string;
}

/**
 * Parse a SKILL.md file content into frontmatter + body
 */
export function parseSkillMd(content: string): ParsedSkill {
  const trimmed = content.trim();

  // Check for YAML frontmatter delimiters
  if (!trimmed.startsWith('---')) {
    throw new Error('SKILL.md must start with YAML frontmatter (---)');
  }

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    throw new Error('SKILL.md frontmatter is not closed (missing closing ---)');
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 3).trim();

  const frontmatter = parseYamlSimple(yamlBlock);

  if (!frontmatter.name) {
    throw new Error('SKILL.md requires a "name" field');
  }
  if (!frontmatter.description) {
    throw new Error('SKILL.md requires a "description" field');
  }

  // Validate name: 1-64 chars, no path separators or control characters
  if (frontmatter.name.length > 64 || frontmatter.name.length === 0) {
    throw new Error(`Invalid skill name "${frontmatter.name}": must be 1-64 characters`);
  }
  if (/[\/\\<>:"|?*\x00-\x1f]/.test(frontmatter.name)) {
    throw new Error(`Invalid skill name "${frontmatter.name}": contains invalid characters`);
  }

  return { frontmatter, body };
}

/**
 * Simple YAML parser for skill frontmatter
 * Handles flat key-value pairs and one level of nested metadata
 */
function parseYamlSimple(yaml: string): SkillMetadata {
  const result: SkillMetadata = { name: '', description: '' };
  const metadataMap: Record<string, string> = {};
  let inMetadata = false;

  for (const line of yaml.split('\n')) {
    const trimmedLine = line.trimEnd();

    // Check for metadata block entries (indented key: value)
    if (inMetadata && /^\s{2,}\S/.test(trimmedLine)) {
      const match = trimmedLine.trim().match(/^(\w[\w-]*):\s*(.*)$/);
      if (match) {
        metadataMap[match[1]] = stripQuotes(match[2]);
      }
      continue;
    }

    inMetadata = false;

    // Top-level key: value
    const match = trimmedLine.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = stripQuotes(rawValue);

    switch (key) {
      case 'name':
        result.name = value;
        break;
      case 'description':
        result.description = value;
        break;
      case 'license':
        result.license = value;
        break;
      case 'compatibility':
        result.compatibility = value;
        break;
      case 'allowed-tools':
        result.allowedTools = value;
        break;
      case 'metadata':
        inMetadata = true;
        break;
    }
  }

  if (Object.keys(metadataMap).length > 0) {
    result.metadata = metadataMap;
  }

  return result;
}

function stripQuotes(s: string): string {
  const trimmed = s.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Convert a skill name (possibly containing Unicode) to a safe ASCII slug for tool IDs.
 * e.g. "数据分析" -> "6570636e5206", "data-analysis" -> "data_analysis"
 */
export function slugifySkillName(name: string): string {
  // If already ASCII-safe, just replace non-alphanumeric with underscores
  if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) || /^[a-z0-9]$/.test(name)) {
    return name.replace(/-/g, '_');
  }
  // For Unicode names, hex-encode to produce a stable ASCII slug
  return Array.from(name)
    .map(ch => ch.codePointAt(0)!.toString(16))
    .join('');
}

/**
 * Generate a SKILL.md template for creating new skills
 */
export function generateSkillTemplate(name: string, description: string): string {
  return `---
name: "${name}"
description: ${description}
metadata:
  author: user
  version: "1.0"
---

# ${name}

## When to use this skill
Describe when this skill should be used...

## How it works
Describe the workflow and steps...

## Examples
Provide example use cases...
`;
}

/**
 * OpenAI Function Calling 格式转换工具 - Skills
 * 将 Skills 定义转换为 OpenAI 的 tools 格式
 */

import { SkillMetadata, SkillParameter } from './base';
import { skillRegistry } from './registry';

/**
 * OpenAI Tool 定义格式
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * 将 SkillParameter 转换为 JSON Schema
 */
function convertParameterToJsonSchema(param: SkillParameter): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: param.type,
    description: param.description,
  };

  if (param.enum) {
    schema.enum = param.enum;
  }

  if (param.default !== undefined) {
    schema.default = param.default;
  }

  return schema;
}

/**
 * 将 Skill 元数据转换为 OpenAI Tool 格式
 */
export function convertSkillToOpenAITool(metadata: SkillMetadata): OpenAITool {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  if (metadata.parameters) {
    for (const param of metadata.parameters) {
      properties[param.name] = convertParameterToJsonSchema(param);
      if (param.required) {
        required.push(param.name);
      }
    }
  }

  return {
    type: 'function',
    function: {
      name: metadata.id,
      description: `[SKILL] ${metadata.name} - ${metadata.description}${
        metadata.requiredTools ? `\nRequires tools: ${metadata.requiredTools.join(', ')}` : ''
      }`,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}

/**
 * 获取所有启用的 Skills 的 OpenAI 格式
 */
export function getOpenAISkills(): OpenAITool[] {
  const skills = skillRegistry.getAll();
  return skills.map(skill => convertSkillToOpenAITool(skill.metadata));
}

/**
 * 生成包含 Skills 的系统提示
 */
export function generateSkillsSystemPrompt(): string {
  const skills = skillRegistry.getAll();

  if (skills.length === 0) {
    return '';
  }

  const skillDescriptions = skills.map(skill => {
    const meta = skill.metadata;
    return `- ${meta.icon || '⚡'} **${meta.name}** (${meta.id}): ${meta.description}${
      meta.requiredTools ? `\n  Required tools: ${meta.requiredTools.join(', ')}` : ''
    }`;
  }).join('\n');

  return `

## Available Skills

You have access to the following high-level skills that orchestrate multiple tools:

${skillDescriptions}

Skills are more powerful than individual tools - they can execute multi-step workflows and maintain state across operations. Use skills when you need to perform complex tasks that involve multiple steps.
`;
}

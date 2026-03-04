// Skills 基础类型和接口定义

import { ToolExecuteResult } from '../../types';
import { ToolRegistry } from '../tools/registry';

/**
 * Skill 参数定义
 */
export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  enum?: any[];
}

/**
 * Skill 元数据
 */
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  version?: string;
  author?: string;
  tags?: string[];
  icon?: string;

  // Skill 需要的工具
  requiredTools?: string[];

  // Skill 参数定义
  parameters?: SkillParameter[];
}

/**
 * Skill 执行步骤
 */
export interface SkillStep {
  name: string;
  tool?: string;
  input: any;
  output: any;
  timestamp: number;
  duration?: number;
}

/**
 * Skill 执行结果
 */
export interface SkillExecuteResult {
  success: boolean;
  output: string;
  data?: any;
  error?: string;
  steps?: SkillStep[];
}

/**
 * Skill 执行上下文
 */
export interface SkillContext {
  tools: ToolRegistry;
  state: Map<string, any>;
}

/**
 * Skill 接口
 */
export interface ISkill {
  readonly metadata: SkillMetadata;
  execute(input: string, context: SkillContext): Promise<SkillExecuteResult>;
  validate?(input: string): Promise<boolean>;
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
}

/**
 * Skill 基类
 */
export abstract class BaseSkill implements ISkill {
  constructor(public readonly metadata: SkillMetadata) {}

  abstract execute(input: string, context: SkillContext): Promise<SkillExecuteResult>;

  async validate(_input: string): Promise<boolean> {
    return true;
  }

  async onLoad(): Promise<void> {
    // 默认空实现
  }

  async onUnload(): Promise<void> {
    // 默认空实现
  }

  /**
   * 辅助方法：调用工具
   */
  protected async callTool(
    toolId: string,
    input: string,
    context: SkillContext
  ): Promise<ToolExecuteResult> {
    return context.tools.execute(toolId, input);
  }

  /**
   * 辅助方法：保存状态
   */
  protected setState(key: string, value: any, context: SkillContext): void {
    context.state.set(key, value);
  }

  /**
   * 辅助方法：获取状态
   */
  protected getState(key: string, context: SkillContext): any {
    return context.state.get(key);
  }
}

/**
 * Skill 加载器接口
 */
export interface ISkillLoader {
  readonly type: string;
  load(source: string): Promise<ISkill[]>;
  unload?(skillId: string): Promise<void>;
}

/**
 * Skill 源配置
 */
export interface SkillSource {
  id: string;
  type: 'builtin' | 'file' | 'http' | 'code';
  name: string;
  source: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

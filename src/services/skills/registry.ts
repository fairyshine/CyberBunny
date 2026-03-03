// Skills 注册表
// 管理所有 Skills 的加载、卸载和执行

import { ISkill, ISkillLoader, SkillSource, SkillContext, SkillExecuteResult } from './base';
import { toolRegistry } from '../tools/registry';
import { logSystem } from '../console/logger';
import { BuiltinSkillLoader } from './loaders/builtin';
import { FileSkillLoader } from './loaders/file';
import { HttpSkillLoader } from './loaders/http';
import { CodeSkillLoader } from './loaders/code';

type ChangeListener = () => void;

/**
 * Skills 注册表
 * 管理所有 Skills 的加载、卸载和执行
 */
export class SkillRegistry {
  private skills: Map<string, ISkill> = new Map();
  private sources: Map<string, SkillSource> = new Map();
  private loaders: Map<string, ISkillLoader> = new Map();
  private listeners: Set<ChangeListener> = new Set();

  constructor() {
    // 注册内置加载器
    this.registerLoader(new BuiltinSkillLoader());
    this.registerLoader(new FileSkillLoader());
    this.registerLoader(new HttpSkillLoader());
    this.registerLoader(new CodeSkillLoader());

    // 自动加载内置 Skills
    this.loadBuiltinSkills();
  }

  /**
   * 订阅 Skills 变更
   */
  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知所有监听器
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * 注册 Skill 加载器
   */
  registerLoader(loader: ISkillLoader): void {
    this.loaders.set(loader.type, loader);
  }

  /**
   * 加载 Skill 源
   */
  async loadSource(source: SkillSource): Promise<void> {
    const loader = this.loaders.get(source.type);
    if (!loader) {
      throw new Error(`No loader found for type: ${source.type}`);
    }

    try {
      // code 类型的源，代码存在 metadata.code 中
      const loadTarget = source.type === 'code' && source.metadata?.code
        ? source.metadata.code as string
        : source.source;
      const skills = await loader.load(loadTarget);

      // 注册所有 Skills
      for (const skill of skills) {
        this.skills.set(skill.metadata.id, skill);
      }

      // 保存源配置
      this.sources.set(source.id, { ...source, enabled: true });

      logSystem('success', `加载 ${skills.length} 个 Skill (${source.name})`, skills.map(s => s.metadata.id));

      // 通知监听器
      this.notify();
    } catch (error) {
      logSystem('error', `加载 Skill 源失败: ${source.name}`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * 卸载 Skill 源
   */
  async unloadSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const loader = this.loaders.get(source.type);

    // 找到并卸载该源的所有 Skills
    const skillsToRemove: string[] = [];
    for (const [skillId, skill] of this.skills.entries()) {
      // 检查 Skill 是否属于该源
      if (this.isSkillFromSource(skill, source)) {
        skillsToRemove.push(skillId);

        // 调用 Skill 的卸载钩子
        await skill.onUnload?.();

        // 调用加载器的卸载方法
        await loader?.unload?.(skillId);
      }
    }

    // 从注册表中移除
    skillsToRemove.forEach(id => this.skills.delete(id));
    this.sources.delete(sourceId);

    logSystem('info', `卸载 ${skillsToRemove.length} 个 Skill (${source.name})`);

    // 通知监听器
    this.notify();
  }

  /**
   * 注册单个 Skill
   */
  register(skill: ISkill): void {
    this.skills.set(skill.metadata.id, skill);
    this.notify();
  }

  /**
   * 注销单个 Skill
   */
  async unregister(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    if (skill) {
      await skill.onUnload?.();
      this.skills.delete(skillId);
      this.notify();
    }
  }

  /**
   * 获取 Skill
   */
  get(skillId: string): ISkill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 获取所有 Skills
   */
  getAll(): ISkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 获取所有 Skill 源
   */
  getAllSources(): SkillSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * 执行 Skill
   */
  async execute(skillId: string, input: string): Promise<SkillExecuteResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // 验证输入
    if (skill.validate) {
      const isValid = await skill.validate(input);
      if (!isValid) {
        throw new Error(`Invalid input for skill: ${skillId}`);
      }
    }

    // 构建上下文
    const context: SkillContext = {
      tools: toolRegistry,
      state: new Map(),
    };

    // 执行 Skill
    logSystem('info', `执行 Skill: ${skillId}`, { input: input.slice(0, 200) });
    const startTime = Date.now();
    const result = await skill.execute(input, context);
    const duration = Date.now() - startTime;

    logSystem(
      result.success ? 'success' : 'error',
      `Skill ${skillId} ${result.success ? '完成' : '失败'}`,
      { duration: `${duration}ms`, steps: result.steps?.length || 0 }
    );

    return result;
  }

  /**
   * 自动加载内置 Skills
   */
  private async loadBuiltinSkills(): Promise<void> {
    const builtinSource: SkillSource = {
      id: 'builtin',
      type: 'builtin',
      name: '内置 Skills',
      source: '',
      enabled: true,
    };

    try {
      await this.loadSource(builtinSource);
    } catch (error) {
      console.error('Failed to load builtin skills:', error);
    }
  }

  /**
   * 获取属于指定源的所有 Skills
   */
  getSkillsBySource(source: SkillSource): ISkill[] {
    return this.getAll().filter(skill => this.isSkillFromSource(skill, source));
  }

  /**
   * 检查 Skill 是否属于指定源
   */
  private isSkillFromSource(skill: ISkill, source: SkillSource): boolean {
    // 根据 Skill ID 或标签判断
    if (source.type === 'builtin') {
      return !skill.metadata.tags?.includes('file') &&
             !skill.metadata.tags?.includes('http') &&
             !skill.metadata.tags?.includes('code');
    }

    if (source.type === 'file' || source.type === 'http' || source.type === 'code') {
      return skill.metadata.tags?.includes(source.id) ?? false;
    }

    return false;
  }
}

// 单例导出
export const skillRegistry = new SkillRegistry();

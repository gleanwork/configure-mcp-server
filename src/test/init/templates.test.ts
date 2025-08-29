import { describe, it, expect } from 'vitest';
import {
  CURSOR_RULE_TEMPLATE,
  CLAUDE_SEARCH_COMMAND_TEMPLATE,
  CLAUDE_CHAT_COMMAND_TEMPLATE,
  CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE,
  CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE,
  CLAUDE_AGENT_TEMPLATE,
  AGENTS_MD_TEMPLATE,
} from '../../init/templates/index.js';
import {
  generateCursorFiles,
  generateClaudeCodeFiles,
} from '../../init/clients/index.js';

describe('Client File Generation', () => {
  describe('generateCursorFiles', () => {
    it('returns correct file structure', () => {
      const files = generateCursorFiles();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('.cursor/rules/glean-mcp.mdc');
      expect(files[0].content).toBeTruthy();
      expect(files[0].content.length).toBeGreaterThan(0);
    });

    it('uses relative paths', () => {
      const files = generateCursorFiles();

      for (const file of files) {
        expect(file.path).not.toMatch(/^[/\\]/); // Should not start with absolute path
        expect(file.path).not.toContain('..'); // Should not contain parent directory references
      }
    });
  });

  describe('generateClaudeCodeFiles', () => {
    it('returns correct file structure', () => {
      const files = generateClaudeCodeFiles();

      expect(files).toHaveLength(5);

      const expectedPaths = [
        '.claude/commands/glean_search.md',
        '.claude/commands/glean_chat.md',
        '.claude/commands/glean_read_document.md',
        '.claude/commands/glean_code_search.md',
        '.claude/agents/glean-expert.md',
      ];

      expectedPaths.forEach((expectedPath, index) => {
        expect(files[index].path).toBe(expectedPath);
        expect(files[index].content).toBeTruthy();
        expect(files[index].content.length).toBeGreaterThan(0);
      });
    });

    it('uses relative paths', () => {
      const files = generateClaudeCodeFiles();

      for (const file of files) {
        expect(file.path).not.toMatch(/^[/\\]/); // Should not start with absolute path
        expect(file.path).not.toContain('..'); // Should not contain parent directory references
      }
    });

    it('command templates contain $ARGUMENTS placeholder', () => {
      const files = generateClaudeCodeFiles();
      const commandFiles = files.filter((f) => f.path.includes('/commands/'));

      expect(commandFiles).toHaveLength(4);

      for (const file of commandFiles) {
        expect(file.content).toContain('$ARGUMENTS');
      }
    });
  });
});

describe('Template Validation', () => {
  describe('frontmatter validation', () => {
    it('cursor template has valid frontmatter', () => {
      const frontmatterMatch = CURSOR_RULE_TEMPLATE.match(
        /^---\n([\s\S]*?)\n---\n/,
      );
      expect(frontmatterMatch).toBeTruthy();

      const frontmatter = frontmatterMatch![1];
      expect(frontmatter).toContain('description:');
      expect(frontmatter).toContain('alwaysApply:');
    });

    it('claude command templates have valid frontmatter', () => {
      const commandTemplates = [
        CLAUDE_SEARCH_COMMAND_TEMPLATE,
        CLAUDE_CHAT_COMMAND_TEMPLATE,
        CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE,
        CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE,
      ];

      for (const template of commandTemplates) {
        const frontmatterMatch = template.match(/^---\n([\s\S]*?)\n---\n/);
        expect(frontmatterMatch).toBeTruthy();

        const frontmatter = frontmatterMatch![1];
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('argument-hint:');
      }
    });

    it('claude agent template has valid frontmatter', () => {
      const frontmatterMatch = CLAUDE_AGENT_TEMPLATE.match(
        /^---\n([\s\S]*?)\n---\n/,
      );
      expect(frontmatterMatch).toBeTruthy();

      const frontmatter = frontmatterMatch![1];
      expect(frontmatter).toContain('name:');
      expect(frontmatter).toContain('description:');
      expect(frontmatter).toContain('tools:');
      expect(frontmatter).toContain('model:');
      expect(frontmatter).toContain('color:');
    });
  });

  describe('content validation', () => {
    it('no templates contain placeholder text', () => {
      const templates = [
        CURSOR_RULE_TEMPLATE,
        CLAUDE_SEARCH_COMMAND_TEMPLATE,
        CLAUDE_CHAT_COMMAND_TEMPLATE,
        CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE,
        CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE,
        CLAUDE_AGENT_TEMPLATE,
        AGENTS_MD_TEMPLATE,
      ];

      for (const template of templates) {
        expect(template).not.toContain('TODO');
        expect(template).not.toContain('FIXME');
        expect(template).not.toContain('{{placeholder}}');
        expect(template).not.toContain('[PLACEHOLDER]');
      }
    });

    it('all templates reference correct server key', () => {
      const templates = [
        CURSOR_RULE_TEMPLATE,
        CLAUDE_SEARCH_COMMAND_TEMPLATE,
        CLAUDE_CHAT_COMMAND_TEMPLATE,
        CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE,
        CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE,
        CLAUDE_AGENT_TEMPLATE,
        AGENTS_MD_TEMPLATE,
      ];

      for (const template of templates) {
        expect(template).toMatch(/glean_default/);
      }
    });

    it('templates end with newlines', () => {
      const templates = [
        CURSOR_RULE_TEMPLATE,
        CLAUDE_SEARCH_COMMAND_TEMPLATE,
        CLAUDE_CHAT_COMMAND_TEMPLATE,
        CLAUDE_READ_DOCUMENT_COMMAND_TEMPLATE,
        CLAUDE_CODE_SEARCH_COMMAND_TEMPLATE,
        CLAUDE_AGENT_TEMPLATE,
        AGENTS_MD_TEMPLATE,
      ];

      for (const template of templates) {
        expect(template).toMatch(/\n$/);
      }
    });
  });
});

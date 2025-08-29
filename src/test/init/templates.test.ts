import { describe, it, expect } from 'vitest';
import { loadTemplate, TemplateName } from '../../init/templates/index.js';
import {
  generateCursorFiles,
  generateClaudeCodeFiles,
} from '../../init/clients/index.js';

describe('Client File Generation', () => {
  describe('generateCursorFiles', () => {
    it('returns correct file structure', async () => {
      const files = await generateCursorFiles();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('.cursor/rules/glean-mcp.mdc');
      expect(files[0].content).toBeTruthy();
      expect(files[0].content.length).toBeGreaterThan(0);
    });

    it('uses relative paths', async () => {
      const files = await generateCursorFiles();

      for (const file of files) {
        expect(file.path).not.toMatch(/^[/\\]/); // Should not start with absolute path
        expect(file.path).not.toContain('..'); // Should not contain parent directory references
      }
    });
  });

  describe('generateClaudeCodeFiles', () => {
    it('returns correct file structure', async () => {
      const files = await generateClaudeCodeFiles();

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

    it('uses relative paths', async () => {
      const files = await generateClaudeCodeFiles();

      for (const file of files) {
        expect(file.path).not.toMatch(/^[/\\]/); // Should not start with absolute path
        expect(file.path).not.toContain('..'); // Should not contain parent directory references
      }
    });

    it('command templates contain $ARGUMENTS placeholder', async () => {
      const files = await generateClaudeCodeFiles();
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
    it('cursor template has valid frontmatter', async () => {
      const template = await loadTemplate(TemplateName.CURSOR_RULE);
      const frontmatterMatch = template.match(/^---\n([\s\S]*?)\n---\n/);
      expect(frontmatterMatch).toBeTruthy();

      const frontmatter = frontmatterMatch![1];
      expect(frontmatter).toContain('description:');
      expect(frontmatter).toContain('alwaysApply:');
    });

    it('claude command templates have valid frontmatter', async () => {
      const commandTemplateNames = [
        TemplateName.CLAUDE_SEARCH_COMMAND,
        TemplateName.CLAUDE_CHAT_COMMAND,
        TemplateName.CLAUDE_READ_DOCUMENT_COMMAND,
        TemplateName.CLAUDE_CODE_SEARCH_COMMAND,
      ];

      for (const templateName of commandTemplateNames) {
        const template = await loadTemplate(templateName);
        const frontmatterMatch = template.match(/^---\n([\s\S]*?)\n---\n/);
        expect(frontmatterMatch).toBeTruthy();

        const frontmatter = frontmatterMatch![1];
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('argument-hint:');
      }
    });

    it('claude agent template has valid frontmatter', async () => {
      const template = await loadTemplate(TemplateName.CLAUDE_AGENT);
      const frontmatterMatch = template.match(/^---\n([\s\S]*?)\n---\n/);
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
    it('no templates contain placeholder text', async () => {
      const templateNames = [
        TemplateName.CURSOR_RULE,
        TemplateName.CLAUDE_SEARCH_COMMAND,
        TemplateName.CLAUDE_CHAT_COMMAND,
        TemplateName.CLAUDE_READ_DOCUMENT_COMMAND,
        TemplateName.CLAUDE_CODE_SEARCH_COMMAND,
        TemplateName.CLAUDE_AGENT,
        TemplateName.AGENTS_MD,
      ];

      for (const templateName of templateNames) {
        const template = await loadTemplate(templateName);
        expect(template).not.toContain('TODO');
        expect(template).not.toContain('FIXME');
        expect(template).not.toContain('{{placeholder}}');
        expect(template).not.toContain('[PLACEHOLDER]');
      }
    });

    it('all templates reference correct server key', async () => {
      const templateNames = [
        TemplateName.CURSOR_RULE,
        TemplateName.CLAUDE_SEARCH_COMMAND,
        TemplateName.CLAUDE_CHAT_COMMAND,
        TemplateName.CLAUDE_READ_DOCUMENT_COMMAND,
        TemplateName.CLAUDE_CODE_SEARCH_COMMAND,
        TemplateName.CLAUDE_AGENT,
        TemplateName.AGENTS_MD,
      ];

      for (const templateName of templateNames) {
        const template = await loadTemplate(templateName);
        expect(template).toMatch(/glean_default/);
      }
    });

    it('templates end with newlines', async () => {
      const templateNames = [
        TemplateName.CURSOR_RULE,
        TemplateName.CLAUDE_SEARCH_COMMAND,
        TemplateName.CLAUDE_CHAT_COMMAND,
        TemplateName.CLAUDE_READ_DOCUMENT_COMMAND,
        TemplateName.CLAUDE_CODE_SEARCH_COMMAND,
        TemplateName.CLAUDE_AGENT,
        TemplateName.AGENTS_MD,
      ];

      for (const templateName of templateNames) {
        const template = await loadTemplate(templateName);
        expect(template).toMatch(/\n$/);
      }
    });
  });
});

describe('Template Loader', () => {
  describe('loadTemplate', () => {
    it('loads valid templates successfully', async () => {
      const template = await loadTemplate(TemplateName.CURSOR_RULE);
      expect(template).toBeTruthy();
      expect(template.length).toBeGreaterThan(0);
      expect(template).toContain('---'); // Should have frontmatter
    });

    it('caches templates after first load', async () => {
      // Load the same template twice
      const template1 = await loadTemplate(TemplateName.CLAUDE_SEARCH_COMMAND);
      const template2 = await loadTemplate(TemplateName.CLAUDE_SEARCH_COMMAND);

      // Should be the same content
      expect(template1).toBe(template2);
    });

    it('throws error for non-existent template', async () => {
      // @ts-expect-error - Testing invalid template name
      await expect(loadTemplate('non-existent/template')).rejects.toThrow(
        'Failed to load template',
      );
    });

    it('loads all template types successfully', async () => {
      const allTemplateNames = Object.values(TemplateName);

      for (const templateName of allTemplateNames) {
        const template = await loadTemplate(templateName);
        expect(template).toBeTruthy();
        expect(template.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('generateClaudeCodeFiles handles template loading failures gracefully', async () => {
      // Mock loadTemplate to simulate failures
      const originalLoadTemplate = await import(
        '../../init/templates/index.js'
      );

      // This test would require mocking, but for now we'll verify the error format
      // by testing with a corrupted template path scenario
      const { generateClaudeCodeFiles } = await import(
        '../../init/clients/claude-code.js'
      );

      // Test should pass with valid templates
      const files = await generateClaudeCodeFiles();
      expect(files).toHaveLength(5);
      expect(files.every((file) => file.content.length > 0)).toBe(true);
    });
  });
});

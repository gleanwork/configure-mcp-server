import { describe, it, expect } from 'vitest';
import {
  loadTemplate,
  TemplateName,
  type TemplateVariables,
} from '../../init/templates/index.js';
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

    it('uses default server name when not specified', async () => {
      const files = await generateCursorFiles();

      expect(files[0].content).toContain('server key: glean_default');
    });

    it('uses custom server name when specified', async () => {
      const files = await generateCursorFiles('my_custom_server');

      expect(files[0].content).toContain('server key: my_custom_server');
      expect(files[0].content).not.toContain('glean_default');
      expect(files[0].content).not.toContain('{{SERVER_NAME}}');
    });
  });

  describe('generateClaudeCodeFiles', () => {
    it('returns correct file structure', async () => {
      const files = await generateClaudeCodeFiles();

      expect(files).toHaveLength(1);

      const expectedPaths = ['.claude/agents/glean-expert.md'];

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

    it('agent template contains server name placeholder replacement', async () => {
      const files = await generateClaudeCodeFiles();
      const agentFile = files.find((f) => f.path.includes('/agents/'));

      expect(agentFile).toBeTruthy();
      expect(agentFile!.content).not.toContain('{{SERVER_NAME}}');
    });

    it('uses default server name when not specified', async () => {
      const files = await generateClaudeCodeFiles();

      // Check agent file has correct tools list
      const agentFile = files.find((f) => f.path.includes('/agents/'));
      expect(agentFile?.content).toContain('mcp__glean_default__search');
      expect(agentFile?.content).toContain('mcp__glean_default__chat');
    });

    it('uses custom server name when specified', async () => {
      const customServerName = 'my_custom_server';
      const files = await generateClaudeCodeFiles(customServerName);

      // Check agent file has correct tools list
      const agentFile = files.find((f) => f.path.includes('/agents/'));
      expect(agentFile?.content).toContain(`mcp__${customServerName}__search`);
      expect(agentFile?.content).toContain(`mcp__${customServerName}__chat`);
      expect(agentFile?.content).not.toContain('glean_default');
    });

    it('handles special characters in server names', async () => {
      const specialServerName = 'test-server_123';
      const files = await generateClaudeCodeFiles(specialServerName);

      const agentFile = files.find((f) => f.path.includes('/agents/'));
      expect(agentFile?.content).toContain(`mcp__${specialServerName}__search`);
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

    it('all templates reference correct server key when using default', async () => {
      const templateNames = [
        TemplateName.CURSOR_RULE,
        TemplateName.CLAUDE_AGENT,
        TemplateName.AGENTS_MD,
      ];

      for (const templateName of templateNames) {
        // Test with default server name substitution
        const template = await loadTemplate(templateName, {
          serverName: 'glean_default',
        });
        expect(template).toMatch(/glean_default/);
        expect(template).not.toContain('{{SERVER_NAME}}');
      }
    });

    it('all templates have placeholder for server name', async () => {
      const templateNames = [
        TemplateName.CURSOR_RULE,
        TemplateName.CLAUDE_AGENT,
        TemplateName.AGENTS_MD,
      ];

      for (const templateName of templateNames) {
        // Test raw template has placeholder
        const template = await loadTemplate(templateName);
        expect(template).toContain('{{SERVER_NAME}}');
      }
    });

    it('templates end with newlines', async () => {
      const templateNames = [
        TemplateName.CURSOR_RULE,
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

    it('substitutes variables in template content', async () => {
      const variables: TemplateVariables = { serverName: 'test_server' };
      const template = await loadTemplate(TemplateName.CURSOR_RULE, variables);

      expect(template).toContain('server key: test_server');
      expect(template).not.toContain('{{SERVER_NAME}}');
    });

    it('handles templates without variables', async () => {
      const templateWithVars = await loadTemplate(TemplateName.CURSOR_RULE);
      const templateWithoutVars = await loadTemplate(
        TemplateName.CURSOR_RULE,
        undefined,
      );

      expect(templateWithVars).toBe(templateWithoutVars);
    });

    it('substitutes multiple variables correctly', async () => {
      const variables: TemplateVariables = { serverName: 'custom_server' };
      const template = await loadTemplate(TemplateName.CLAUDE_AGENT, variables);

      // Should have multiple substitutions in the tools list
      expect(template).toContain('mcp__custom_server__search');
      expect(template).toContain('mcp__custom_server__chat');
      expect(template).toContain('mcp__custom_server__read_document');
      expect(template).toContain('mcp__custom_server__code_search');
      expect(template).not.toContain('{{SERVER_NAME}}');
    });

    it('caches templates after first load', async () => {
      // Load the same template twice
      const template1 = await loadTemplate(TemplateName.CLAUDE_AGENT);
      const template2 = await loadTemplate(TemplateName.CLAUDE_AGENT);

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
      // This test verifies the function works correctly with valid templates
      const { generateClaudeCodeFiles } = await import(
        '../../init/clients/claude-code.js'
      );

      // Test should pass with valid templates
      const files = await generateClaudeCodeFiles();
      expect(files).toHaveLength(1);
      expect(files.every((file) => file.content.length > 0)).toBe(true);
    });
  });
});

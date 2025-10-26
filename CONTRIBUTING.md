# Contributing to @gleanwork/configure-mcp-server

Thank you for your interest in contributing to the Glean MCP Server! This document provides guidelines and instructions for development.

## Development Setup

1. Clone the repository:

```bash
git clone https://github.com/gleanwork/configure-mcp-server.git
cd configure-mcp-server
```

1. Ensure `node` and `npm` are installed. This project has a built-in
   [mise](http://mise.jdx.dev/) config file that you can use if you'd like
   (though it is not required):

```
mise trust
mise install
```

1. Install dependencies:

```bash
npm install
```

1. Build the project:

```bash
npm run build
```

1. Run tests:

```bash
npm test
```

## Running the CLI Locally

The CLI is built into the `build` directory:

```bash
node ./build/index.js [command]
```

## Making Changes

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## Code Style

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint and Prettier)
- Include JSDoc comments for public APIs
- Write tests for new functionality

## Testing

- Add unit tests for new features
- Ensure all tests pass before submitting a pull request
- Use the provided test utilities and fixtures

## Documentation

- Update documentation for any changed functionality
- Include examples for new features
- Keep the README.md and API documentation up to date

## Need Help?

- Documentation: [docs.glean.com](https://docs.glean.com)
- Issues: [GitHub Issues](https://github.com/gleanwork/mcp-server/issues)
- Email: [support@glean.com](mailto:support@glean.com)

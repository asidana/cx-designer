# Contributing to Agentic CX Designer

Thank you for your interest in contributing!

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   make install
   ```
3. Start development servers:
   ```bash
   make dev
   ```

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `make test`
5. Update documentation
6. Submit a pull request

## Code Style

- TypeScript: Follow ESLint configuration
- Python: Follow PEP 8
- Use Prettier for formatting

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

## Adding a New Node

1. Create a new file in `src/nodes/<category>/`
2. Implement the `NodeDefinition` interface
3. Register the node in `src/nodes/index.ts`
4. Add tests in `tests/`
5. Update documentation

## Adding a Framework Adapter

1. Create a new file in `src/adapters/<framework>/`
2. Implement the adapter interface
3. Register the adapter in `src/adapters/index.ts`
4. Add tests
5. Update documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

# TypeScript Monorepo Boilerplate

A modern, production-ready TypeScript monorepo boilerplate with comprehensive tooling for building, testing, and publishing packages.

[![CI](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/ci.yml)
[![Release](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/release.yml/badge.svg)](https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate/actions/workflows/release.yml)

## 🚀 Features

- **⚡ Fast Build**: [tsup](https://tsup.egoist.dev/) for blazing fast TypeScript compilation
- **🧪 Modern Testing**: [Vitest](https://vitest.dev/) with unit & integration test separation
- **📦 Monorepo Management**: [pnpm workspaces](https://pnpm.io/workspaces) with efficient dependency management
- **🔧 TypeScript Project References**: Optimized build performance and better IDE experience
- **📝 Version Management**: [Changesets](https://github.com/changesets/changesets) for semantic versioning
- **🔍 Code Quality**: ESLint + Prettier with comprehensive rules
- **🚀 CI/CD**: GitHub Actions with automated testing, building, and publishing
- **🔒 Security**: Dependabot + automated security audits
- **📊 Coverage**: Comprehensive test coverage reporting

## 📁 Project Structure

```
├── .github/
│   ├── workflows/          # CI/CD workflows
│   └── dependabot.yml      # Dependency updates
├── .changeset/             # Changesets configuration
├── packages/
│   ├── common/             # Shared utilities library
│   └── example/            # Example package using common
├── tsconfig*.json          # TypeScript configurations
├── vitest.config.ts        # Test configuration
├── tsup.config.ts          # Build configuration
└── pnpm-workspace.yaml     # Workspace configuration
```

## 🛠 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/y1j2x34/tsup-vitest-monorepo-boilerplate.git
cd tsup-vitest-monorepo-boilerplate

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## 📋 Available Scripts

### Root Level Commands

```bash
pnpm build              # Build all packages
pnpm build:watch        # Build in watch mode
pnpm test               # Run all tests
pnpm test:unit          # Run unit tests only
pnpm test:integration   # Run integration tests only
pnpm test:coverage      # Run tests with coverage
pnpm lint               # Lint and fix code
pnpm lint:check         # Check linting without fixing
pnpm type-check         # TypeScript type checking
```

### Version Management

```bash
pnpm changeset          # Create a new changeset
pnpm changeset:version  # Version packages based on changesets
pnpm changeset:publish  # Publish packages to npm
```

## 🏗 Architecture

### TypeScript Configuration

The project uses TypeScript project references for optimal build performance:

- `tsconfig.json` - Main configuration with project references
- `tsconfig.options.json` - Shared compiler options
- `tsconfig.source.json` - Source code configuration
- `tsconfig.test.json` - Test files configuration
- `tsconfig.devtools.json` - Development tools configuration

### Custom Conditions

The monorepo uses custom import conditions (`@monorepo/source`) to:
- Enable "Go to definition" to navigate to source files instead of build outputs
- Improve development experience in IDEs
- Maintain proper module resolution in development

### Testing Strategy

- **Unit Tests**: Located in `**/unit/**/*.spec.ts`
- **Integration Tests**: Located in `**/integration/**/*.spec.ts`
- **Coverage**: Comprehensive coverage reporting with configurable thresholds
- **Environment**: Node.js testing environment with global test utilities

## 🚀 CI/CD Pipeline

### Workflows

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Tests on Node.js 18, 20, 22
   - Cross-platform testing (Ubuntu, Windows, macOS)
   - Linting and type checking
   - Security audits
   - Coverage reporting

2. **Release Pipeline** (`.github/workflows/release.yml`)
   - Automated version management with changesets
   - Publishing to npm and GitHub Packages
   - GitHub releases creation

3. **Dependabot Auto-merge** (`.github/workflows/dependabot-auto-merge.yml`)
   - Automatic approval and merging of minor/patch dependency updates
   - Major updates require manual review

### Required Secrets

For the CI/CD pipeline to work properly, set up these GitHub secrets:

```bash
NPM_TOKEN          # npm publishing token
CODECOV_TOKEN      # Codecov integration (optional)
```

## 📦 Publishing

### NPM Registry

Packages are automatically published to npm when:
1. A changeset is created and merged
2. The release workflow runs successfully
3. All tests pass

### GitHub Packages

Packages are also published to GitHub Packages registry for internal use.

## 🔧 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and add tests**
   ```bash
   pnpm test
   ```

3. **Create a changeset** (for version changes)
   ```bash
   pnpm changeset
   ```

4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature
   ```

## 🛡 Security

- **Dependabot**: Automated dependency updates
- **Security Audits**: Automated vulnerability scanning
- **Husky**: Pre-commit hooks for code quality
- **Lint-staged**: Staged files linting

## 📝 Adding New Packages

1. Create package directory in `packages/`
2. Add `package.json` with workspace dependencies
3. Configure build and test scripts
4. Update workspace references if needed

Example package.json:
```json
{
  "name": "@monorepo/new-package",
  "version": "1.0.0",
  "main": "./lib/index.js",
  "module": "./lib/index.mjs",
  "types": "./lib/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "@monorepo/source": "./src/index.ts",
        "types": "./lib/index.d.mts",
        "default": "./lib/index.mjs"
      },
      "require": {
        "@monorepo/source": "./src/index.ts",
        "types": "./lib/index.d.ts",
        "default": "./lib/index.js"
      }
    }
  },
  "scripts": {
    "build": "tsup ./src/index.ts --config ../../tsup.config.ts",
    "test": "vitest --config ../../vitest.config.ts run"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes with conventional commits
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [tsup](https://tsup.egoist.dev/) - Fast TypeScript bundler
- [Vitest](https://vitest.dev/) - Modern testing framework
- [Changesets](https://github.com/changesets/changesets) - Version management
- [pnpm](https://pnpm.io/) - Efficient package manager 
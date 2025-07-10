# Changeset Guide

This project uses [Changeset](https://github.com/changesets/changesets) for version management and publishing.

## How to Add a Changeset

When you make changes that should be released, you need to add a changeset file:

1. **Run the changeset command:**
   ```bash
   pnpm changeset
   ```

2. **Follow the prompts:**
   - Select which packages have changed
   - Choose the type of change (major, minor, patch)
   - Write a brief description of your changes

3. **Commit the changeset file:**
   ```bash
   git add .changeset/your-changeset-file.md
   git commit -m "feat: add new feature"
   ```

## Release Process

The release process is automated via GitHub Actions:

1. **Development:** Create PRs with changeset files
2. **Release PR:** When changeset files are merged to master, a release PR is automatically created
3. **Publish:** When the release PR is merged, packages are automatically published to NPM

## Change Types

- **Major (breaking):** Breaking changes that require major version bump
- **Minor (feature):** New features that are backward compatible
- **Patch (fix):** Bug fixes and small improvements

## Example Changeset File

```markdown
---
"@vgerbot/web-rpc": minor
---

Add new transport for WebSocket connections
```

## Commands

- `pnpm changeset` - Create a new changeset
- `pnpm changeset:version` - Consume changesets and update versions
- `pnpm changeset:publish` - Publish packages to NPM

## Configuration

The changeset configuration is in `.changeset/config.json`:
- Private packages (like examples) are ignored
- Public packages are published with public access
- Base branch is `master` 
---
name: git-commit
description: Generate conventional commit messages following git-commit standards. Use this skill when creating git commits to ensure consistent, descriptive commit messages.
license: MIT
---

# Git Commit Skill

Generate well-formatted git commit messages following conventional commit standards.

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

## Guidelines

1. **Subject line**: Use imperative mood ("add" not "added" or "adds")
2. **Subject line**: Limit to 50 characters
3. **Subject line**: Do not end with a period
4. **Body**: Wrap at 72 characters
5. **Body**: Explain what and why, not how
6. **Footer**: Reference issues (#123)

## Examples

```
feat(session): add lazy-loading for message history

Implement lazy-loading mechanism to load message history from
database only when needed, reducing memory usage.

Fixes #45
```

```
fix(auth): correct token validation in JWT middleware

The previous implementation incorrectly validated expired tokens,
allowing unauthorized access.
```

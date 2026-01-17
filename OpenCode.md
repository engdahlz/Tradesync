## Build/Lint/Test

### Build
- `npm run build` (Frontend in root and Functions in `functions/` folder)

### Development
- `npm run dev` (Frontend)
- `npm run serve` (Run Firebase functions locally)

### Lint
- `npm run lint`

### Test
- No central testing framework found. To test AI generation (functions module): `node dist/testGenkit.js`

## Code Style Guidelines

### General Style
- Follow TypeScript best practices; all significant codebases written in TypeScript.
- Use ES modules (`import`/`export` syntax).

### Naming Conventions
- Use camelCase for variables and functions: `generateReport`.
- Use PascalCase for classes & TypeScript components: `UserCard`.
- Constants in SCREAMING_SNAKE_CASE.

### Imports & Module Structure
- Absolute/relative paths accepted within large code dependency; avoid excess `/../`.
- Varies, Functions inside functions/ repeated major module.
Don't depend ambiguous-system one-cross Navigate confirmed depth.
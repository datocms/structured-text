# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a Lerna-managed monorepo for DatoCMS Structured Text (DAST) utilities. It provides TypeScript libraries for handling, converting, and rendering DatoCMS Structured Text documents across multiple formats.

## Commands

### Building

```bash
npm run build          # Bootstrap all packages and build them
lerna bootstrap        # Install dependencies for all packages
lerna run build        # Build all packages
```

Individual packages can be built by navigating to `packages/<package-name>` and running:

```bash
npm run build          # Compiles TypeScript to both CommonJS (dist/cjs) and ESM (dist/esm)
```

### Testing

```bash
npm test               # Run linter and all tests
jest                   # Run tests only
jest <file-pattern>    # Run specific test file(s)
```

Tests are located in `__tests__` directories within each package using Jest with ts-jest preset.

### Linting & Formatting

```bash
npm run lint           # ESLint check on all .ts/.tsx files
npm run prettier       # Format all TypeScript and JSON files
```

Pre-commit hook automatically runs `pretty-quick --staged` to format staged files.

### Publishing

```bash
npm run publish        # Build, test, and publish to npm
npm run publish-next   # Publish with 'next' dist-tag
```

## Architecture

### Monorepo Structure

The repository contains 9 packages in `packages/`:

**Core:**

- `utils`: Foundation package with TypeScript types, tree manipulation, validation, rendering framework, and inspection utilities for DAST documents

**Converters (to DAST):**

- `html-to-structured-text`: Converts HTML/Hast syntax trees to DAST
- `contentful-to-structured-text`: Migrates Contentful Rich Text to DAST

**Renderers (from DAST):**

- `generic-html-renderer`: Base HTML rendering utilities (marks, spans, node rules)
- `to-html-string`: Server-side HTML string renderer
- `to-dom-nodes`: Browser-based DOM node renderer
- `to-plain-text`: Plain text extractor

**Framework Utilities:**

- `slate-utils`: Slate.js integration helpers

### DAST (DatoCMS Abstract Syntax Tree)

The structured text format follows a tree structure defined in `packages/utils/src/types.ts`:

**Root structure:**

- Every DAST document starts with a `root` node containing block-level children
- Schema is always `"dast"`

**Block nodes:** `paragraph`, `heading`, `list`, `listItem`, `blockquote`, `code`, `block`, `thematicBreak`

**Inline nodes:** `span`, `link`, `itemLink`, `inlineItem`, `inlineBlock`

**Key characteristics:**

- Block nodes can have custom `style` attributes (paragraph, heading)
- Inline nodes contain text marks (strong, emphasis, code, underline, strikethrough, highlight)
- `block` and `inlineBlock` reference external DatoCMS items
- `itemLink` references other DatoCMS records

Node types, allowed children, and allowed attributes are defined in `packages/utils/src/definitions.ts`.

### Core Utilities Package

**Tree Manipulation** (`manipulation.ts`):

- `visit()`: Traverse tree with visitor pattern
- `find()`, `findAll()`: Query nodes with predicates
- `map()`, `filter()`: Transform/filter tree nodes
- `getNodePath()`, `hasPath()`: Path-based navigation
- Works with full documents (`{schema: 'dast', document: ...}`) or bare nodes

**Inspector** (`inspector.ts`):

- `inspect()`: Pretty-print DAST trees with customizable formatting
- Supports custom block formatters for embedded items
- Configurable width, indentation

**Rendering Framework** (`render.ts`):

- `render()`: Generic rendering with adapter pattern
- Adapter requires `renderNode()`, `renderText()`, `renderFragment()`
- `renderRule()`: Helper for creating render rules with guard predicates

**Validation** (`validate.ts`):

- `validate()`: Ensures DAST conforms to specification
- `isValidDocument()`, `isValidNode()`: Type guards

**Type Guards** (`guards.ts`):

- Type predicates for all node types (e.g., `isHeading()`, `isParagraph()`)
- Enables type-safe narrowing in TypeScript

### Package Build System

Each package uses dual build:

- `tsconfig.json`: Compiles to CommonJS (`dist/cjs/`)
- `tsconfig.esnext.json`: Compiles to ES modules (`dist/esm/`)

Both produce TypeScript declarations in `dist/types/`.

The root `tsconfig.json` provides shared compiler options (strict mode, ES2015+ libs).

### Inter-package Dependencies

Most packages depend on `datocms-structured-text-utils` for core types and utilities. Lerna manages workspace linking during development. When publishing, packages reference specific versions of dependencies.

## Development Notes

- TypeScript strict mode is enabled with `strictNullChecks`
- Target is ES5 for broad compatibility
- Both CommonJS and ESM outputs are produced
- All packages export typings for TypeScript consumers
- Generic HTML renderer provides base utilities used by specific renderers
- Tree manipulation functions are immutable - they return new trees rather than mutating

## Package-Specific Notes

**html-to-structured-text:**

- Uses rehype/hast for HTML parsing
- Supports both browser (DOMParser) and Node.js (parse5) environments
- Configurable handlers for custom HTML elements
- Can restrict allowed blocks, heading levels, and marks

**generic-html-renderer:**

- Provides `renderSpanValue()` for handling text spans with marks
- Mark-to-tag mapping (emphasis→em, underline→u, strikethrough→s, highlight→mark)
- Used as foundation by to-html-string and to-dom-nodes

**utils:**

- `update-links.js` script updates GitHub links in README.md to match current line numbers
- Tree manipulation supports custom type parameters for block/inline item types

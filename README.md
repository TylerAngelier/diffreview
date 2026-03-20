# Diff Review

Review git diffs locally with inline comments. Perfect for reviewing AI-generated code (Codex, Claude Code, etc.) before committing.

## Features

- **Three comment types**: Line-level, range (click-and-drag), and file-level
- **Code snippets included**: Comments reference the actual code for stable AI matching
- **Export to markdown**: Clean, structured output ready to paste into any coding agent
- **Shift-click & drag**: Easy range selection on the diff
- **Ctrl+Enter**: Quick submit while typing
- **Zero configuration**: Just run from any git project

## Quick Start

```bash
npm install -g diffreview

cd your-project

# Review staged changes
diffreview

# Review uncommitted changes
diffreview

# Review changes against a specific commit/branch
diffreview main
```

Opens a browser UI with:
- File sidebar with change stats
- Interactive diff with line numbers
- Click to add comments
- Drag to select ranges
- Export button for structured markdown

## Usage Flow

1. **Run**: `diffreview`
2. **Review**: Browse the diff, click lines or drag to select ranges
3. **Comment**: Type your review, hit Ctrl+Enter or click Comment
4. **Export**: Click "Export Review" to copy markdown to clipboard
5. **Apply**: Paste the markdown into your AI coding agent

## Export Format

```markdown
## Review: my-project

### src/lib/auth.ts

**Lines 2–4 (new):**
```ts
+  const user = db.findUser(username);
+  const token = parseToken(user.session.token);
+  const decoded = verifyToken(token);
```

No null check on user. If username doesn't exist, this crashes.

---

**File comment:** This module is getting too large. Consider splitting into smaller modules.

---

### src/components/Login.tsx

**Line 45 (removed):**
```ts
function validateUser(input: UserInput) { ... }
```

Was this intentionally removed? The login flow still calls it.

---
```

## Architecture

- **CLI**: Node.js with Commander for argument parsing and git diff execution
- **Server**: In-memory HTTP server (no database needed)
- **Diff Parser**: diff2html for accurate line mapping
- **Browser UI**: Vanilla JS with Monaco-style diff display (no framework overhead)
- **Export**: Structured markdown with fenced code blocks

## License

ISC

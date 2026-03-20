# DiffReview: Inline Comments (GitHub PR Style)

## Goal
Move comments from the separate right panel into the diff viewer itself, rendering them inline between diff lines — exactly like GitHub's PR review diff viewer.

## Current Architecture
- `src/public/index.html` — Single-file SPA with all HTML/CSS/JS
- `src/server.js` — HTTP server, serves HTML + API endpoints
- `src/diff-parser.js` — Parses unified diff into structured data
- `src/cli.js` — CLI entry point

## Current Layout
```
[Sidebar (280px)] [Diff Viewer (flex)] [Comments Panel (360px)]
```

## Target Layout
```
[Sidebar (280px)] [Diff Viewer with inline comments (flex)]
```

Remove the right comments panel entirely. Comments appear inline in the diff.

## How GitHub PR Review Inline Comments Work

1. **Comment threads appear between diff lines** — a comment targeting lines 2-4 renders as a card inserted after line 4 in the diff table, spanning the full width
2. **Visual indicator** — a small blue dot or line appears on the commented line(s) in the gutter
3. **The comment card** shows: line range, code snippet (collapsed by default or shown), comment text, delete button
4. **Multiple comments on the same range** stack in the same thread card
5. **File-level comments** appear at the top of the diff, before any lines
6. **Clicking the gutter indicator** scrolls to the inline comment
7. **The comment form** appears inline at the selection point, not in a sidebar

## Implementation Plan

### 1. Remove the comments panel
- Delete `.comments-panel` from the layout
- Expand `.main` to fill the remaining space
- Remove all references to `commentsList`, `commentsEmpty`, `renderCommentsForFile`

### 2. Modify `renderDiff()` to interleave comments
After rendering all diff lines for a file, insert comment cards inline:
- For each file-level comment: insert at the top of the diff table
- For each line/range comment: insert after the last line in the range

The comment card should be a `<tr>` that spans the full table width (using `<td colspan="3">`).

### 3. Comment card inline design
```html
<tr class="comment-thread">
  <td colspan="3">
    <div class="inline-comment">
      <!-- Gutter connector line -->
      <div class="comment-connector"></div>
      <div class="comment-card">
        <div class="comment-meta">src.js — Lines 2–4</div>
        <div class="comment-code">...</div>
        <div class="comment-text">No null check on user...</div>
        <div class="comment-actions">
          <button class="btn-delete">Delete</button>
        </div>
      </div>
    </div>
  </td>
</tr>
```

### 4. Line gutter indicators
On lines that have comments, add a visual indicator (small colored circle or marker) in the line number cell. Use CSS `::after` pseudo-element.

### 5. Comment form appears inline
When user selects lines and clicks to comment:
- Insert the comment form inline at the selection point (after the selected lines)
- The form includes: selection info, textarea, submit/cancel buttons
- On submit: add comment, re-render diff with new inline comment, remove form
- On cancel: remove form, clear selection

### 6. Style the inline comments
Use the existing dark theme variables. Key styles:
- `.comment-thread` — full-width row with slight left padding
- `.comment-connector` — vertical line connecting to the gutter (like GitHub's blue line)
- `.inline-comment` — the card itself, slightly narrower than full width
- Comment cards should have rounded corners, subtle background, the existing comment-bg color

### 7. Update `renderDiff()` flow
```
function renderDiff() {
  // 1. Render hunk headers and diff lines as before
  // 2. After rendering all lines, get comments for current file
  // 3. For file-level comments: prepend before first line
  // 4. For line/range comments: insert after the matching line
  // 5. Mark commented lines with a CSS class for the gutter indicator
}
```

### 8. File comment button
Move the "File comment" button into the toolbar area or make it available via a button at the top of the diff.

### 9. Export functionality
Keep the export button in the sidebar footer. It should still work the same way.

## Constraints
- Single-file HTML (no build step for the frontend)
- No new dependencies
- Keep the dark theme (Catppuccin Mocha)
- All existing functionality must be preserved: line selection, shift-click range, comment CRUD, export
- Mobile responsive is not critical but don't break it worse

## Testing
Run with: `node src/cli.js` from the diffreview directory, or `npx diffreview` from any git repo with changes.

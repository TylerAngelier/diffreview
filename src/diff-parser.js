import { parse as diffParse } from "diff2html";

export function parseDiff(diffText) {
  const rawFiles = diffParse(diffText);

  return rawFiles.map((file) => {
    const hunks = [];

    for (const block of file.blocks) {
      const oldStart = block.oldStart ?? block.oldStartLine ?? null;
      const newStart = block.newStart ?? block.newStartLine ?? null;

      let oldLine = Number.isInteger(oldStart) ? oldStart : null;
      let newLine = Number.isInteger(newStart) ? newStart : null;
      const lines = [];

      for (const line of block.lines) {
        const hasProvidedOld = Number.isInteger(line.oldNumber);
        const hasProvidedNew = Number.isInteger(line.newNumber);

        const entry = {
          oldNumber: hasProvidedOld ? line.oldNumber : null,
          newNumber: hasProvidedNew ? line.newNumber : null,
          content: line.content,
          type: line.type,
        };

        // Fallback for diff2html versions that do not provide per-line numbers
        if (!hasProvidedOld && !hasProvidedNew && oldLine !== null && newLine !== null) {
          if (line.type === "context") {
            entry.oldNumber = oldLine++;
            entry.newNumber = newLine++;
          } else if (line.type === "insert") {
            entry.newNumber = newLine++;
          } else if (line.type === "delete") {
            entry.oldNumber = oldLine++;
          }
        }

        lines.push(entry);
      }

      hunks.push({
        oldStart,
        newStart,
        header: block.header,
        lines,
      });
    }

    return {
      oldName: file.oldName,
      newName: file.newName,
      language: file.language,
      deleted: file.deleted,
      added: file.added,
      hunks,
      stats: {
        additions: file.addedLines,
        deletions: file.deletedLines,
      },
    };
  });
}

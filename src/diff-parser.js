import { parse as diffParse } from "diff2html";

export function parseDiff(diffText) {
  const rawFiles = diffParse(diffText);

  return rawFiles.map((file) => {
    const hunks = [];

    for (const block of file.blocks) {
      const oldStart = block.oldStart;
      const newStart = block.newStart;

      let oldLine = oldStart;
      let newLine = newStart;
      const lines = [];

      for (const line of block.lines) {
        const entry = {
          oldNumber: null,
          newNumber: null,
          content: line.content,
          type: line.type,
        };

        if (line.type === "context") {
          entry.oldNumber = oldLine++;
          entry.newNumber = newLine++;
        } else if (line.type === "insert") {
          entry.newNumber = newLine++;
        } else if (line.type === "delete") {
          entry.oldNumber = oldLine++;
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

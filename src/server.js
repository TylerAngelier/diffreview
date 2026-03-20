import { createServer as httpCreate } from "http";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export function createServer(files, projectName) {
  const comments = [];

  const app = httpCreate(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        const html = await readFile(
          resolve(__dirname, "public", "index.html"),
          "utf-8"
        );
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (url.pathname === "/api/files") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ files, projectName }));
        return;
      }

      if (url.pathname === "/api/comments" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ comments }));
        return;
      }

      if (url.pathname === "/api/comments" && req.method === "POST") {
        const contentType = req.headers["content-type"];
        if (!contentType || !contentType.includes("application/json")) {
          res.writeHead(415, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Content-Type must be application/json" }));
          return;
        }

        let body;
        try {
          body = await readBody(req);
        } catch (e) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
          return;
        }

        let comment;
        try {
          comment = JSON.parse(body);
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
          return;
        }

        // Validate required fields
        if (!comment.file || typeof comment.file !== "string") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing or invalid 'file' field" }));
          return;
        }
        if (!comment.text || typeof comment.text !== "string") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing or invalid 'text' field" }));
          return;
        }
        if (!comment.type || !["line", "range", "file"].includes(comment.type)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing or invalid 'type' field (must be 'line', 'range', or 'file')" }));
          return;
        }

        comment.id = crypto.randomUUID();
        comments.push(comment);
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ comment }));
        return;
      }

      if (url.pathname === "/api/comments" && req.method === "DELETE") {
        const id = url.searchParams.get("id");
        const idx = comments.findIndex((c) => c.id === id);
        if (idx === -1) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Comment not found" }));
          return;
        }
        comments.splice(idx, 1);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, id }));
        return;
      }

      if (url.pathname === "/api/export" && req.method === "POST") {
        const markdown = exportToMarkdown(files, comments, projectName);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ markdown }));
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    } catch (e) {
      console.error("Server error:", e);
      res.writeHead(500);
      res.end("Internal server error");
    }
  });

  return new Promise((resolve) => {
    app.listen(0, "127.0.0.1", () => {
      const port = app.address().port;
      const url = `http://127.0.0.1:${port}`;
      resolve({
        url,
        close: () => {
          app.close();
        },
      });
    });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body exceeds 1MB limit"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function exportToMarkdown(files, comments, projectName) {
  const branch = "review";
  let md = `## Review: ${projectName}\n\n`;

  // Group comments by file
  const byFile = new Map();
  for (const c of comments) {
    const key = c.file;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(c);
  }

  for (const [file, fileComments] of byFile) {
    md += `### ${file}\n\n`;

    // Find the file data to get code snippets
    const fileData = files.find(
      (f) => f.oldName === file || f.newName === file
    );

    for (const c of fileComments) {
      if (c.type === "file") {
        md += `**File comment:** ${c.text}\n\n`;
      } else {
        const side = c.side === "old" ? "removed" : "new";

        if (c.type === "range" && c.startLine !== undefined && c.endLine !== undefined) {
          md += `**Lines ${c.startLine}\u2013${c.endLine} (${side}):**\n`;
        } else if (c.type === "line" && c.line !== undefined) {
          md += `**Line ${c.line} (${side}):**\n`;
        } else if (c.startLine !== undefined && c.endLine !== undefined) {
          md += `**Lines ${c.startLine}\u2013${c.endLine} (${side}):**\n`;
        } else if (c.line !== undefined) {
          md += `**Line ${c.line} (${side}):**\n`;
        } else {
          md += `**Comment:**\n`;
        }

        // Include code snippet if available
        if (c.codeSnippet && c.codeSnippet.trim()) {
          const lang = fileData?.language || "";
          md += "```" + lang + "\n";
          md += c.codeSnippet;
          md += "\n```\n\n";
        }

        md += `${c.text}\n\n`;
      }

      md += "---\n\n";
    }
  }

  if (comments.length === 0) {
    md += "_No comments. LGTM._\n";
  }

  return md;
}

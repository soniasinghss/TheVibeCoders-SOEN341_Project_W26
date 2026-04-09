import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const includeDirs = [
  path.join(repoRoot, "backend", "src"),
  path.join(repoRoot, "frontend")
];

const includeFileExtensions = new Set([".js", ".css", ".html"]);
const ignoredDirs = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

const messages = [];

function toRel(absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, "/");
}

function isKebabCase(name) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name);
}

function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

function isPascalCase(name) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(name);
}

function isUpperSnakeCase(name) {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(path.join(dirPath, entry.name));
      }
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const ext = path.extname(entry.name);
    if (!includeFileExtensions.has(ext)) {
      continue;
    }

    checkFilename(fullPath);

    if (ext === ".js") {
      checkJavaScript(fullPath);
    } else if (ext === ".css") {
      checkCss(fullPath);
    } else if (ext === ".html") {
      checkHtml(fullPath);
    }
  }
}

function checkFilename(fullPath) {
  const base = path.basename(fullPath, path.extname(fullPath));
  if (!isKebabCase(base)) {
    messages.push(`${toRel(fullPath)}: file name must be kebab-case`);
  }
}

function checkJavaScript(fullPath) {
  const content = fs.readFileSync(fullPath, "utf8");
  const rel = toRel(fullPath);
  const isModelFile = rel.startsWith("backend/src/models/");
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const classMatch = line.match(/^\s*class\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
    if (classMatch) {
      const name = classMatch[1];
      if (!isPascalCase(name)) {
        messages.push(`${rel}:${i + 1} class '${name}' must be PascalCase`);
      }
    }

    const declMatch = line.match(/^\s*(const|let|var|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
    if (declMatch) {
      const keyword = declMatch[1];
      const name = declMatch[2];
      const allowedSpecials = new Set(["__dirname", "__filename"]);
      const allowModelPascalConst = keyword === "const" && isModelFile && isPascalCase(name);
      if (!allowedSpecials.has(name) && !allowModelPascalConst && !isCamelCase(name) && !isUpperSnakeCase(name)) {
        messages.push(`${rel}:${i + 1} identifier '${name}' must be camelCase (or UPPER_SNAKE_CASE for constants)`);
      }
    }

    const envMatch = line.match(/process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g) || [];
    for (const token of envMatch) {
      const key = token.split(".").pop();
      if (key && !isUpperSnakeCase(key)) {
        messages.push(`${rel}:${i + 1} environment key '${key}' must be UPPER_SNAKE_CASE`);
      }
    }

    // Rough object key check for unquoted keys in object literals.
    const keyMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      const allowed = new Set(["_id", "__v", "Authorization"]);
      if (!allowed.has(key) && !isCamelCase(key) && !isUpperSnakeCase(key)) {
        messages.push(`${rel}:${i + 1} object field '${key}' should be camelCase`);
      }
    }
  }
}

function checkCss(fullPath) {
  const content = fs.readFileSync(fullPath, "utf8");
  const rel = toRel(fullPath);
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const classMatches = [...line.matchAll(/\.([A-Za-z_-][A-Za-z0-9_-]*)/g)];
    for (const match of classMatches) {
      const className = match[1];
      if (!isKebabCase(className)) {
        messages.push(`${rel}:${i + 1} CSS class '${className}' must be kebab-case`);
      }
    }
  }
}

function checkHtml(fullPath) {
  const content = fs.readFileSync(fullPath, "utf8");
  const rel = toRel(fullPath);
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const idMatches = [...line.matchAll(/\bid\s*=\s*"([A-Za-z_][A-Za-z0-9_-]*)"/g)];
    for (const match of idMatches) {
      const id = match[1];
      if (!isCamelCase(id)) {
        messages.push(`${rel}:${i + 1} HTML id '${id}' must be camelCase`);
      }
    }

    const classMatches = [...line.matchAll(/\bclass\s*=\s*"([^"]+)"/g)];
    for (const match of classMatches) {
      const classes = match[1].split(/\s+/).filter(Boolean);
      for (const className of classes) {
        if (!isKebabCase(className)) {
          messages.push(`${rel}:${i + 1} HTML class '${className}' must be kebab-case`);
        }
      }
    }
  }
}

for (const dir of includeDirs) {
  if (fs.existsSync(dir)) {
    walk(dir);
  }
}

if (messages.length > 0) {
  console.error("Naming convention violations found:\n");
  for (const msg of messages) {
    console.error(`- ${msg}`);
  }
  process.exitCode = 1;
} else {
  console.log("Naming convention check passed.");
}

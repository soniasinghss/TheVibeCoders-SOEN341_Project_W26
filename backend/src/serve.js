const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "frontend");
const PORT = 5500;

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".webp": "image/webp",
	".ico": "image/x-icon",
};

function sendFile(res, filePath) {
	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Not Found");
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		const contentType = MIME_TYPES[ext] || "application/octet-stream";
		res.writeHead(200, { "Content-Type": contentType });
		res.end(data);
	});
}

const server = http.createServer((req, res) => {
	const rawPath = decodeURIComponent((req.url || "/").split("?")[0]);
	const relativePath = rawPath === "/" ? "/login.html" : rawPath;
	const absolutePath = path.normalize(path.join(ROOT, relativePath));

	if (!absolutePath.startsWith(ROOT)) {
		res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Forbidden");
		return;
	}

	fs.stat(absolutePath, (err, stat) => {
		if (!err && stat.isFile()) {
			sendFile(res, absolutePath);
			return;
		}

		if (!err && stat.isDirectory()) {
			const indexPath = path.join(absolutePath, "index.html");
			sendFile(res, indexPath);
			return;
		}

		res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Not Found");
	});
});

server.listen(PORT, "127.0.0.1", () => {
	console.log(`Frontend server running at http://127.0.0.1:${PORT}`);
});


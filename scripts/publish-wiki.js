#!/usr/bin/env node
/**
 * scripts/publish-wiki.js
 * Publish a local docs/ folder to the repository's GitHub Wiki.
 * - prefers SSH when run locally
 * - prefers token-backed HTTPS in CI (GITHUB_ACTIONS)
 * - supports --create to create the wiki repo
 * - supports --dry-run to preview actions
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const argv = require("minimist")(process.argv.slice(2), {
  boolean: ["dry-run", "create", "verbose"],
  string: ["docs", "branch"],
  alias: { d: "dry-run", c: "create" },
  default: { branch: "main" },
});

const DRY = !!argv["dry-run"];
const CREATE = !!argv["create"];
const BRANCH = argv.branch || "main";
const VERBOSE = !!argv.verbose;

function findDocsDir(requested) {
  const candidates = [];
  if (requested) candidates.push(path.resolve(process.cwd(), requested));
  candidates.push(path.resolve(process.cwd(), "docs"));
  candidates.push(path.resolve(process.cwd(), "src", "docs"));
  candidates.push(path.resolve(process.cwd(), "content"));
  candidates.push(path.resolve(process.cwd(), "src", "content"));
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
    } catch (e) {
      /* ignore */
    }
  }
  return null;
}

const DOCS_DIR = findDocsDir(argv.docs);

function log(...a) {
  console.log("[publish-wiki]", ...a);
}
function err(...a) {
  console.error("[publish-wiki]", ...a);
}

function runShell(cmd, opts = {}) {
  if (DRY) {
    log("[dry-run]", cmd);
    return;
  }
  if (VERBOSE) log("run:", cmd);
  execSync(cmd, Object.assign({ stdio: "inherit" }, opts));
}

function runCapture(cmd, opts = {}) {
  if (DRY) return "";
  try {
    return execSync(cmd, Object.assign({ encoding: "utf8" }, opts)).toString();
  } catch (e) {
    return "";
  }
}

function spawnShell(cmd, cwd) {
  if (DRY) {
    log("[dry-run] (cwd=" + cwd + ")", cmd);
    return { status: 0 };
  }
  if (VERBOSE) log("(cwd=" + cwd + ")", cmd);
  const p = spawnSync("sh", ["-c", cmd], { cwd, stdio: "inherit" });
  if (p.error) throw p.error;
  if (p.status !== 0) throw new Error("command failed: " + cmd);
  return p;
}

function maskToken(u) {
  if (!u) return u;
  return u.replace(/(https:\/\/).*:(.*)@/, "$1***:***@");
}

function resolveOwnerRepo() {
  try {
    const url = runCapture("git remote get-url origin");
    const m = url.trim().match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
    if (m) return { owner: m[1], repo: m[2], remoteUrl: url.trim() };
  } catch (e) {}
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const repoUrl = pkg.repository && (pkg.repository.url || pkg.repository);
      if (repoUrl) {
        const m = repoUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
        if (m) return { owner: m[1], repo: m[2], remoteUrl: repoUrl };
      }
    }
  } catch (e) {}
  throw new Error(
    "unable to determine owner/repo (ensure git remote or package.json repository)"
  );
}

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) throw new Error("source not found: " + src);
  const st = fs.statSync(src);
  if (st.isFile()) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    return;
  }
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src))
    copyRecursive(path.join(src, name), path.join(dst, name));
}

function emptyDirExceptGit(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git") continue;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}

async function tryEnsureWikiRepo(owner, repo, token) {
  // Ensure the repository `owner/repo` exists and has the wiki enabled.
  if (!token) return false;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  const doFetch = async (url, method = "GET", body = undefined) => {
    if (typeof fetch === "function") {
      const opts = { method, headers };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch (e) {
        /* ignore */
      }
      return { ok: res.ok, status: res.status, json };
    }
    try {
      const methodFlag = method === "GET" ? "" : `-X ${method}`;
      const dataFlag = body !== undefined ? `-d '${JSON.stringify(body)}'` : "";
      const cmd = `curl -s ${methodFlag} -H "Authorization: token ${token}" -H "Accept: application/vnd.github.v3+json" -H "Content-Type: application/json" ${dataFlag} ${url} -w '\n%{http_code}'`;
      const out = runCapture(cmd);
      if (!out) return { ok: false, status: 0, json: null };
      const lastNewline = out.lastIndexOf("\n");
      const bodyText = lastNewline !== -1 ? out.slice(0, lastNewline) : out;
      const statusCode =
        lastNewline !== -1 ? parseInt(out.slice(lastNewline + 1), 10) : 0;
      let json = null;
      try {
        json = bodyText ? JSON.parse(bodyText) : null;
      } catch (e) {
        /* ignore */
      }
      return {
        ok: statusCode >= 200 && statusCode < 300,
        status: statusCode,
        json,
      };
    } catch (e) {
      if (VERBOSE) err("curl fallback failed", e && e.message ? e.message : e);
      return { ok: false, status: 0, json: null };
    }
  };

  try {
    // Check if repo exists
    const repoRes = await doFetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      "GET"
    );
    if (!repoRes.ok) {
      // Repo missing — create it under the authenticated user or the org
      const userRes = await doFetch("https://api.github.com/user", "GET");
      if (!userRes.ok) return false;
      const login = userRes.json && userRes.json.login;
      if (login === owner) {
        const createRes = await doFetch(
          "https://api.github.com/user/repos",
          "POST",
          { name: repo, private: false }
        );
        if (!createRes.ok) return false;
      } else {
        const createRes = await doFetch(
          `https://api.github.com/orgs/${owner}/repos`,
          "POST",
          { name: repo, private: false }
        );
        if (!createRes.ok) return false;
      }
    }

    // Enable wiki on the repo
    const patchRes = await doFetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      "PATCH",
      { has_wiki: true }
    );
    return patchRes.ok;
  } catch (e) {
    if (VERBOSE)
      err("api create/enable failed", e && e.message ? e.message : e);
    return false;
  }
}

async function main() {
  log("publish-wiki starting");
  if (!fs.existsSync(DOCS_DIR))
    throw new Error("docs directory not found: " + DOCS_DIR);

  const { owner, repo } = resolveOwnerRepo();
  const wikiRepo = `${repo}.wiki.git`;

  const GITHUB_ACTIONS = !!process.env.GITHUB_ACTIONS;
  const TOKEN =
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_PAT ||
    process.env.GH_TOKEN ||
    process.env.PERSONAL_TOKEN;

  const sshUrl = `git@github.com:${owner}/${wikiRepo}`;
  const httpsAuthUrl = TOKEN
    ? `https://x-access-token:${TOKEN}@github.com/${owner}/${wikiRepo}`
    : null;
  const httpsPlainUrl = `https://github.com/${owner}/${wikiRepo}`;

  const prefs = GITHUB_ACTIONS
    ? [httpsAuthUrl, sshUrl, httpsPlainUrl]
    : [sshUrl, httpsAuthUrl, httpsPlainUrl];

  log("owner/repo:", owner + "/" + repo);
  log("docs source:", DOCS_DIR);
  log("preferred remotes:", prefs.filter(Boolean).map(maskToken).join(" , "));

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-"));
  const work = path.join(tmp, "wiki");

  let cloned = false;
  let used = null;

  for (const url of prefs) {
    if (!url) continue;
    try {
      log("attempting clone", maskToken(url));
      if (DRY) {
        log("[dry-run] git clone", url, work);
        fs.mkdirSync(work, { recursive: true });
        cloned = true;
        used = url;
        break;
      }
      runShell(`git clone ${url} ${work}`);
      cloned = true;
      used = url;
      break;
    } catch (e) {
      if (VERBOSE)
        err("clone failed for", maskToken(url), e && e.message ? e.message : e);
    }
  }

  if (!cloned) {
    try {
      const whichGh = runCapture("which gh").trim();
      if (whichGh) {
        const ghc = `gh repo clone ${owner}/${repo}.wiki ${work}`;
        log("gh CLI detected, attempting gh repo clone fallback");
        if (DRY) {
          log("[dry-run]", ghc);
          fs.mkdirSync(work, { recursive: true });
          cloned = true;
          used = "gh";
        } else {
          runShell(ghc);
          cloned = true;
          used = "gh";
        }
      }
    } catch (e) {
      if (VERBOSE)
        err("gh fallback not available", e && e.message ? e.message : e);
    }
  }

  if (!cloned) {
    if (!CREATE) {
      log("wiki repo not cloned and --create not set, aborting");
      process.exit(2);
    }
    let apiCreated = false;
    if (TOKEN) apiCreated = await tryCreateRepoApi(owner, repo, TOKEN);
    fs.mkdirSync(work, { recursive: true });
    log("initializing new git repo at", work);
    spawnShell("git init", work);
    const remote = httpsAuthUrl || sshUrl || httpsPlainUrl;
    if (!remote)
      throw new Error("no remote available to add (need token or ssh)");
    spawnShell(`git remote add origin ${remote}`, work);
    used = remote;
    if (apiCreated) log("wiki repo created via API");
  }

  if (cloned) emptyDirExceptGit(work);

  log("copying docs into wiki workdir");
  copyRecursive(DOCS_DIR, work);

  spawnShell("git add -A", work);
  if (!DRY) {
    const st = runCapture("git status --porcelain", { cwd: work });
    if (!st.trim()) return log("no changes to publish");
  }

  try {
    spawnShell('git commit -m "Update wiki from docs/" || true', work);
  } catch (e) {
    if (VERBOSE) err("commit failed:", e && e.message ? e.message : e);
  }

  if (DRY) {
    log("[dry-run] would push to", maskToken(used));
    return;
  }

  try {
    spawnShell(`git checkout -B ${BRANCH}`, work);
    spawnShell(`git push -u origin ${BRANCH} --force`, work);
    log("push completed");
  } catch (e) {
    err("git push failed:", e && e.message ? e.message : e);
    try {
      const whichGh = runCapture("which gh").trim();
      if (whichGh) {
        if (CREATE) {
          try {
            spawnShell(
              `gh repo create ${owner}/${repo}.wiki --public --confirm`,
              work
            );
            log("attempted gh repo create");
          } catch (ghErr) {
            if (VERBOSE)
              err(
                "gh create failed:",
                ghErr && ghErr.message ? ghErr.message : ghErr
              );
          }
        }
        spawnShell(`git push -u origin ${BRANCH} --force`, work);
        log("push completed after gh fallback");
        return;
      }
    } catch (ghErr) {
      if (VERBOSE)
        err(
          "gh fallback failed:",
          ghErr && ghErr.message ? ghErr.message : ghErr
        );
    }
    err(
      "push failed; ensure SSH access locally or set GITHUB_TOKEN in CI with repo permissions"
    );
    process.exit(3);
  }
}

main().catch((e) => {
  err("fatal", e && e.message ? e.message : e);
  process.exit(1);
});

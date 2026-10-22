const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const deployScript = resolve(__dirname, "../scripts/deploy.js");
const branch = "feat/pet-project-migration";

function run(command, args, cwd, env = process.env) {
  return spawnSync(command, args, { cwd, env, encoding: "utf8" });
}

function git(args, cwd) {
  const result = run("git", args, cwd);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("deploy sends only the exact pushed branch SHA and rejects dirty or ahead work", () => {
  const temp = mkdtempSync(join(tmpdir(), "hello-data-deploy-"));
  try {
    const remote = join(temp, "remote.git");
    const repo = join(temp, "repo");
    const bin = join(temp, "bin");
    const sshArgs = join(temp, "ssh-args.txt");
    mkdirSync(repo);
    mkdirSync(bin);
    git(["init", "--bare", remote], temp);
    git(["init", "--initial-branch", branch], repo);
    git(["config", "user.name", "Deploy Test"], repo);
    git(["config", "user.email", "deploy@example.test"], repo);
    writeFileSync(join(repo, "README.md"), "initial\n");
    git(["add", "README.md"], repo);
    git(["commit", "-m", "test: initial"], repo);
    git(["remote", "add", "origin", remote], repo);
    git(["push", "-u", "origin", branch], repo);
    const revision = git(["rev-parse", "HEAD"], repo);

    const fakeSsh = join(bin, "ssh");
    writeFileSync(fakeSsh, '#!/bin/sh\nprintf "%s\\n" "$@" > "$SSH_ARGS_FILE"\n');
    chmodSync(fakeSsh, 0o755);
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      SSH_ARGS_FILE: sshArgs,
      DEPLOY_SSH_DESTINATION: "test@localhost",
      DEPLOY_REMOTE_EXECUTABLE: "/test/deploy-root",
    };

    const success = run(process.execPath, [deployScript], repo, env);
    assert.equal(success.status, 0, success.stderr);
    assert.deepEqual(readFileSync(sshArgs, "utf8").trim().split("\n"), [
      "-o", "BatchMode=yes", "test@localhost", "/test/deploy-root", "hello-data.amirs.dev", revision,
    ]);

    writeFileSync(join(repo, "README.md"), "dirty\n");
    const dirty = run(process.execPath, [deployScript], repo, env);
    assert.equal(dirty.status, 1);
    assert.match(dirty.stderr, /Commit or discard local changes/);

    git(["add", "README.md"], repo);
    git(["commit", "-m", "test: ahead"], repo);
    const ahead = run(process.execPath, [deployScript], repo, env);
    assert.equal(ahead.status, 1);
    assert.match(ahead.stderr, /HEAD must equal the pushed/);
    assert.equal(readFileSync(sshArgs, "utf8").trim().split("\n").at(-1), revision);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

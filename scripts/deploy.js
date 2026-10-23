const { spawnSync } = require("node:child_process");

const branch = "refs/heads/master";
const project = "hello-data.amirs.dev";

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.error?.message || `git ${args[0]} failed`);
  }
  return result.stdout.trim();
}

try {
  if (git(["status", "--porcelain"])) {
    throw new Error("Commit or discard local changes before deploying");
  }

  const revision = git(["rev-parse", "--verify", "HEAD"]);
  if (!/^[0-9a-f]{40}$/.test(revision)) {
    throw new Error("HEAD is not a full Git SHA");
  }

  const remote = git(["ls-remote", "--exit-code", "origin", branch]);
  if (remote !== `${revision}\t${branch}`) {
    throw new Error(`HEAD must equal the pushed origin/${branch.slice("refs/heads/".length)} tip`);
  }

  const destination = process.env.DEPLOY_SSH_DESTINATION || "root@143.110.220.15";
  const executable = process.env.DEPLOY_REMOTE_EXECUTABLE || "/usr/local/sbin/pet-project-deploy-root";
  if (!/^[a-zA-Z0-9_.@-]+$/.test(destination) || !/^\/[a-zA-Z0-9_./-]+$/.test(executable)) {
    throw new Error("Invalid SSH destination or remote executable");
  }

  const result = spawnSync("ssh", ["-o", "BatchMode=yes", destination, executable, project, revision], {
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || `Remote deploy failed (${result.status})`);
  }
  console.log(`Deployed ${project} at ${revision}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

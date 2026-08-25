#!/usr/bin/env node
//
// Releases the ten datocms-structured-text-* packages.
//
// The order of the steps is the whole point: everything that can fail (network,
// tests, credentials) runs BEFORE anything irreversible, and the irreversible
// steps go npm first, git second. `changeset publish` does both halves in that
// order by itself — it publishes, then tags only the packages npm accepted — so
// a tag can never outlive a failed publish.
//
// There is deliberately no rollback, because every step is idempotent: the
// publish skips versions already on the registry, the tagging skips tags that
// already exist, and each GitHub release skips itself. A release that dies
// halfway through is resumed by running this again.
//
// It is JavaScript rather than bash because under `set -e` the exit status of
// whatever a loop last evaluated becomes the loop's exit status, and this script
// twice sat one non-matching last package away from dying between `npm publish`
// and `git push`.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPackages } from '@manypkg/get-packages';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

// Normal releases happen here. Prereleases are routinely cut from a feature
// branch, so --tag only asks that the branch be clean and pushed.
const RELEASE_BRANCH = 'main';

/** A refusal we wrote ourselves, as opposed to a step that failed. */
class Aborted extends Error {}

const fail = (message) => {
  throw new Aborted(message);
};
const step = (message) => console.log(`\n\x1b[1m==> ${message}\x1b[0m`);

/** Runs a step the human is watching, and throws if it fails. */
const run = (file, args, options = {}) =>
  execFileSync(file, args, { stdio: 'inherit', ...options });

/** Runs a command for its output, and throws if it fails. */
const capture = (file, args) =>
  execFileSync(file, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

/**
 * Exit status as a question, for the commands whose failure is an answer rather
 * than an error: "am I logged in?", "does this release already exist?".
 */
const succeeds = (file, args) => {
  try {
    execFileSync(file, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const pendingChangesets = () =>
  readdirSync('.changeset').filter(
    (entry) => entry.endsWith('.md') && entry !== 'README.md',
  );

/**
 * What this release covers, as `{ kind, name, version }` entries: `publish` for
 * a version not yet on the registry, `tag-only` for one that got there before a
 * previous run died. Asked of changesets rather than reconstructed here — it is
 * the same plan `changeset publish` is about to execute, registry lookups
 * included, so the two cannot disagree about what is being released.
 */
const publishPlan = () => {
  const file = path.join(tmpdir(), `publish-plan-${process.pid}.json`);
  try {
    // Captured, not shown: `changeset publish` prints the same registry
    // summary again a moment later.
    capture('npx', ['changeset', 'publish-plan', '--output', file]);
    return JSON.parse(readFileSync(file, 'utf8')).plan.flat();
  } finally {
    rmSync(file, { force: true });
  }
};

/**
 * The section of a package's CHANGELOG for one version, without its "## x.y.z"
 * heading — changesets has already written exactly the prose we want.
 */
const changelogSection = (dir, version) => {
  const file = path.join(dir, 'CHANGELOG.md');
  // A package released for the first time has no CHANGELOG.md yet.
  if (!existsSync(file)) return '';
  const [, section = ''] = readFileSync(file, 'utf8').split(
    `\n## ${version}\n`,
  );
  return section.split('\n## ')[0].trim();
};

const main = async () => {
  // The only flag: `--tag next` publishes under that npm dist-tag instead of
  // `latest`, and marks the GitHub releases as prereleases.
  const [flag, distTag = ''] = process.argv.slice(2);
  if (flag && flag !== '--tag') fail(`unknown option: ${flag}`);
  if (flag && !distTag) fail('--tag needs a value.');

  // -------------------------------------------------------------------------
  // Preflight: no mutations, just refuse to start from a state we can't finish.
  // -------------------------------------------------------------------------
  step('Preflight');

  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

  if (!distTag) {
    if (branch !== RELEASE_BRANCH) {
      fail(
        `you are not on ${RELEASE_BRANCH}. Use --tag to publish a prerelease from a branch.`,
      );
    }
    if (existsSync('.changeset/pre.json')) {
      fail(
        'the repo is in changesets pre mode (.changeset/pre.json).\n' +
          "  Run 'npx changeset pre exit' before cutting a real release.",
      );
    }
  }

  if (capture('git', ['status', '--porcelain'])) {
    fail('working tree is dirty. Commit or stash first.');
  }

  run('git', ['fetch', '--quiet', 'origin', branch]);
  if (
    capture('git', ['rev-parse', 'HEAD']) !==
    capture('git', ['rev-parse', `origin/${branch}`])
  ) {
    fail(`${branch} and origin/${branch} have diverged. Pull (or push) first.`);
  }

  if (!succeeds('npm', ['whoami']))
    fail("you are not logged in to npm. Run 'npm login'.");
  if (!succeeds('gh', ['auth', 'status'])) {
    fail(
      "the GitHub CLI is missing or logged out, so the release notes can't be published.",
    );
  }

  const npmUser = capture('npm', ['whoami']);
  console.log(`on ${branch}, in sync with origin, npm user: ${npmUser}`);

  // -------------------------------------------------------------------------
  // Everything that can fail. Nothing has been mutated yet, so a network
  // timeout here costs you nothing but the rerun.
  //
  // Skipped when there are no changesets to apply, which is what a resumed
  // release looks like: the versions were bumped and committed by the run that
  // died, and the plan below picks up whatever it didn't finish.
  // -------------------------------------------------------------------------
  const bumping = pendingChangesets().length > 0;

  if (bumping) {
    step('Building');
    run('npm', ['run', 'build']);

    step('Testing');
    run('npm', ['test']);

    // -----------------------------------------------------------------------
    // Mutations, local only. Still nothing pushed, still nothing published.
    // -----------------------------------------------------------------------
    step('Applying pending changesets');
    run('npx', ['changeset', 'version']);

    step('Refreshing the lockfile');
    run('npm', ['install', '--package-lock-only']);
  }

  step('Reading the publish plan');
  const plan = publishPlan();
  for (const { kind, name, version } of plan) {
    console.log(
      `  ${name}@${version}${kind === 'tag-only' ? ' (already on npm)' : ''}`,
    );
  }
  if (plan.length === 0) {
    fail(
      'there is nothing to release: every package is already published and tagged.\n' +
        "  Describe your changes with 'npx changeset' first.",
    );
  }

  if (bumping) {
    step('Committing the release');
    // With independent versioning a release moves an arbitrary number of
    // packages at an arbitrary number of versions, so the full `name@version`
    // list goes in the commit *body*: spelled into the subject, a release
    // touching all ten ran to 442 characters. The subject keeps a short exact
    // form whenever there is one to state.
    const tags = plan.map((entry) => `${entry.name}@${entry.version}`);
    const versions = new Set(plan.map((entry) => entry.version));
    const subject =
      tags.length === 1
        ? `release: ${tags[0]}`
        : versions.size === 1
        ? `release: v${[...versions][0]}`
        : `release: ${tags.length} packages`;
    run('git', ['add', '-A']);
    // A second -m is a paragraph, not a second subject line.
    const message = tags.length === 1 ? [subject] : [subject, tags.join('\n')];
    run('git', ['commit', ...message.flatMap((part) => ['-m', part])]);
  }

  // -------------------------------------------------------------------------
  // The irreversible step: npm, then one annotated `name@version` tag for each
  // package npm accepted.
  // -------------------------------------------------------------------------
  step('Publishing to npm and tagging');
  run('npx', ['changeset', 'publish', ...(distTag ? ['--tag', distTag] : [])]);

  step('Pushing to GitHub');
  run('git', ['push', '--follow-tags', 'origin', branch]);

  // -------------------------------------------------------------------------
  // The release notes: one GitHub release per tag, its body the CHANGELOG
  // section changesets just wrote. Last, because it's the only step a human can
  // redo by hand from the changelog if it goes wrong.
  // -------------------------------------------------------------------------
  step('Publishing the release notes');
  const { packages } = await getPackages(ROOT);
  const dirOf = new Map(
    packages.map((pkg) => [pkg.packageJson.name, pkg.relativeDir]),
  );

  for (const { name, version } of plan) {
    const tag = `${name}@${version}`;
    if (succeeds('gh', ['release', 'view', tag])) {
      console.log(`${tag}: the release already exists, leaving it alone`);
      continue;
    }
    // A prerelease must not become the repo's "Latest release": that's reserved
    // for whatever is on the `latest` dist-tag. Decided per package, not once
    // for the run, so one prerelease version can't mark the others.
    const prerelease = distTag || version.includes('-') ? ['--prerelease'] : [];
    const notes =
      changelogSection(dirOf.get(name), version) || `Released \`${tag}\`.`;
    // --verify-tag: refuse to invent a release for a tag the push didn't carry.
    const args = ['--title', tag, '--verify-tag', '--notes-file', '-'];
    run('gh', ['release', 'create', tag, ...args, ...prerelease], {
      input: notes,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  }

  console.log('\n\x1b[32mReleased\x1b[0m');
};

try {
  await main();
} catch (error) {
  // A step that failed has already said what it had to say on stderr; all we
  // add is which one, and the fact that nothing after it ran.
  const summary = [String(error.message).split('\n')[0], error.stderr]
    .filter(Boolean)
    .join('\n');
  const detail =
    error instanceof Aborted
      ? error.message
      : `${summary}\n  The step above printed the details.`;
  console.error(`\n\x1b[31mAborted: ${detail}\x1b[0m`);
  process.exit(1);
}

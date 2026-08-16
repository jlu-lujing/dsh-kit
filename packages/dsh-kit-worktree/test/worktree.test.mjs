import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import * as wt from '../src/worktree.ts'

function makeRepo() {
  const base = mkdtempSync(join(tmpdir(), 'dsh-kit-worktree-test-'))
  const repo = join(base, 'repo')
  execFileSync('git', ['init', '-q', '-b', 'main', repo], { encoding: 'utf8' })
  execFileSync('git', ['-C', repo, 'config', 'user.email', 'a@b'], { encoding: 'utf8' })
  execFileSync('git', ['-C', repo, 'config', 'user.name', 't'], { encoding: 'utf8' })
  execFileSync('git', ['-C', repo, 'commit', '--allow-empty', '-qm', 'init'], { encoding: 'utf8' })
  return { base, repo }
}

test('listWorktrees：主 worktree + 默认落盘 .dsh/worktree', () => {
  const { base, repo } = makeRepo()
  try {
    const l0 = wt.listWorktrees(repo)
    assert.equal(l0.worktrees.length, 1)
    assert.equal(l0.root, wt.repoRoot(repo))
    assert.equal(l0.defaultParent, join(wt.repoRoot(repo), '.dsh', 'worktree'))

    const c = wt.createWorktree({ cwd: repo, branch: 'feat/x' })
    assert.equal(c.added, true)
    // 默认建在仓库内 .dsh/worktree/<branch>
    assert.ok(c.path.includes(join('.dsh', 'worktree', 'feat', 'x')))
    assert.ok(existsSync(c.path))

    const l1 = wt.listWorktrees(repo)
    assert.equal(l1.worktrees.length, 2)
    const main = l1.worktrees.find((w) => w.main)
    const feat = l1.worktrees.find((w) => !w.main)
    assert.equal(main.branch, 'refs/heads/main')
    assert.equal(feat.branch, 'refs/heads/feat/x')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('createWorktree：分支名校验 + 目标已存在报错', () => {
  const { base, repo } = makeRepo()
  try {
    assert.equal(wt.validateBranch('feat/y'), true)
    assert.equal(wt.validateBranch('../bad'), false)
    const c = wt.createWorktree({ cwd: repo, branch: 'feat/y' })
    assert.throws(() => wt.createWorktree({ cwd: repo, branch: 'feat/y' }), /path already exists|already checked out/)
    // 同一分支不能重复 checkout
    assert.throws(() => wt.createWorktree({ cwd: repo, branch: 'feat/y', path: join(base, 'other') }), /already checked out/)
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('removeWorktree + prune：删除后列表回落', () => {
  const { base, repo } = makeRepo()
  try {
    const c = wt.createWorktree({ cwd: repo, branch: 'feat/z' })
    const r = wt.removeWorktree({ path: c.path }, repo)
    assert.equal(r.removed, true)
    assert.equal(wt.listWorktrees(repo).worktrees.length, 1)
    assert.throws(() => wt.removeWorktree({ path: join(base, 'nope') }, repo), /not a removable/)
    wt.pruneWorktrees(repo)
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('外部自定义路径：可建在仓库外', () => {
  const { base, repo } = makeRepo()
  try {
    const outside = join(base, 'outside-wt')
    const c = wt.createWorktree({ cwd: repo, branch: 'feat/out', path: outside })
    assert.equal(c.path, outside)
    assert.ok(existsSync(outside))
    assert.throws(() => wt.createWorktree({ cwd: repo, branch: 'feat/nope2', path: join(base, 'no-parent', 'x') }), /parent directory does not exist/)
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

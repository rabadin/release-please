"use strict";
// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const mocha_1 = require("mocha");
const sinon = require("sinon");
const github_1 = require("../../src/github");
const bazel_1 = require("../../src/strategies/bazel");
const module_bazel_1 = require("../../src/updaters/bazel/module-bazel");
const changelog_1 = require("../../src/updaters/changelog");
const tag_name_1 = require("../../src/util/tag-name");
const version_1 = require("../../src/version");
const helpers_1 = require("../helpers");
const sandbox = sinon.createSandbox();
const COMMITS = [
    ...(0, helpers_1.buildMockConventionalCommit)('fix(deps): update dependency com.google.cloud:google-cloud-storage to v1.120.0'),
    ...(0, helpers_1.buildMockConventionalCommit)('fix(deps): update dependency com.google.cloud:google-cloud-spanner to v1.50.0'),
    ...(0, helpers_1.buildMockConventionalCommit)('chore: update common templates'),
];
(0, mocha_1.describe)('Bazel', () => {
    let github;
    (0, mocha_1.beforeEach)(async () => {
        github = await github_1.GitHub.create({
            owner: 'googleapis',
            repo: 'bazel-test-repo',
            defaultBranch: 'main',
        });
    });
    (0, mocha_1.afterEach)(() => {
        sandbox.restore();
    });
    (0, mocha_1.describe)('buildReleasePullRequest', () => {
        (0, mocha_1.it)('returns release PR changes with defaultInitialVersion', async () => {
            var _a;
            const expectedVersion = '1.0.0';
            const strategy = new bazel_1.Bazel({
                targetBranch: 'main',
                github,
                component: 'rules_cc',
            });
            const latestRelease = undefined;
            const release = await strategy.buildReleasePullRequest(COMMITS, latestRelease);
            (0, chai_1.expect)((_a = release.version) === null || _a === void 0 ? void 0 : _a.toString()).to.eql(expectedVersion);
        });
        (0, mocha_1.it)('returns release PR changes with semver patch bump', async () => {
            var _a;
            const expectedVersion = '0.123.5';
            const strategy = new bazel_1.Bazel({
                targetBranch: 'main',
                github,
                component: 'rules_cc',
            });
            const latestRelease = {
                tag: new tag_name_1.TagName(version_1.Version.parse('0.123.4'), 'rules_cc'),
                sha: 'abc123',
                notes: 'some notes',
            };
            const release = await strategy.buildReleasePullRequest(COMMITS, latestRelease);
            (0, chai_1.expect)((_a = release.version) === null || _a === void 0 ? void 0 : _a.toString()).to.eql(expectedVersion);
        });
    });
    (0, mocha_1.describe)('buildUpdates', () => {
        (0, mocha_1.it)('builds common files', async () => {
            const strategy = new bazel_1.Bazel({
                targetBranch: 'main',
                github,
                component: 'rules_cc',
            });
            const latestRelease = undefined;
            const release = await strategy.buildReleasePullRequest(COMMITS, latestRelease);
            const updates = release.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'CHANGELOG.md', changelog_1.Changelog);
            (0, helpers_1.assertHasUpdate)(updates, 'MODULE.bazel', module_bazel_1.ModuleBazel);
        });
        (0, mocha_1.it)('allows configuring the version file', async () => {
            const strategy = new bazel_1.Bazel({
                targetBranch: 'main',
                github,
                component: 'rules_cc',
                versionFile: 'some-path/MODULE.bazel',
                path: 'packages',
            });
            const latestRelease = undefined;
            const release = await strategy.buildReleasePullRequest(COMMITS, latestRelease);
            const updates = release.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'packages/CHANGELOG.md', changelog_1.Changelog);
            (0, helpers_1.assertHasUpdate)(updates, 'packages/some-path/MODULE.bazel', module_bazel_1.ModuleBazel);
        });
        (0, mocha_1.it)('omits changelog if skipChangelog=true', async () => {
            const strategy = new bazel_1.Bazel({
                targetBranch: 'main',
                github,
                component: 'rules_cc',
                versionFile: 'some-path/MODULE.bazel',
                path: 'packages',
                skipChangelog: true,
            });
            const latestRelease = undefined;
            const release = await strategy.buildReleasePullRequest(COMMITS, latestRelease);
            const updates = release.updates;
            (0, helpers_1.assertNoHasUpdate)(updates, 'CHANGELOG.md');
            (0, helpers_1.assertHasUpdate)(updates, 'packages/some-path/MODULE.bazel', module_bazel_1.ModuleBazel);
        });
    });
});
//# sourceMappingURL=bazel.js.map
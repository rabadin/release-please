"use strict";
// Copyright 2021 Google LLC
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
exports.buildMockPackageUpdate = void 0;
const mocha_1 = require("mocha");
const sinon = require("sinon");
const github_1 = require("../../src/github");
const node_workspace_1 = require("../../src/plugins/node-workspace");
const chai_1 = require("chai");
const version_1 = require("../../src/version");
const package_json_1 = require("../../src/updaters/node/package-json");
const helpers_1 = require("../helpers");
const snapshot = require("snap-shot-it");
const changelog_1 = require("../../src/updaters/changelog");
const release_please_manifest_1 = require("../../src/updaters/release-please-manifest");
const node_1 = require("../../src/strategies/node");
const tag_name_1 = require("../../src/util/tag-name");
const generic_1 = require("../../src/updaters/generic");
const prerelease_1 = require("../../src/versioning-strategies/prerelease");
const sandbox = sinon.createSandbox();
const fixturesPath = './test/fixtures/plugins/node-workspace';
function buildMockPackageUpdate(path, fixtureName) {
    const cachedFileContents = (0, helpers_1.buildGitHubFileContent)(fixturesPath, fixtureName);
    return {
        path,
        createIfMissing: false,
        cachedFileContents,
        updater: new package_json_1.PackageJson({
            version: version_1.Version.parse(JSON.parse(cachedFileContents.parsedContent).version),
        }),
    };
}
exports.buildMockPackageUpdate = buildMockPackageUpdate;
function buildMockChangelogUpdate(path, versionString, changelogEntry) {
    const cachedFileContents = (0, helpers_1.buildGitHubFileRaw)(changelogEntry);
    return {
        path,
        createIfMissing: false,
        cachedFileContents,
        updater: new changelog_1.Changelog({
            changelogEntry,
            version: version_1.Version.parse(versionString),
        }),
    };
}
/**
 * Helper test to ensure that the file update exists and that
 * the file is a json file with a .version equal to the provided
 * version string.
 *
 * @param {Update[]} updates List of updates to search for
 * @param {string} fixture Fixture name
 * @param {string} expectedVersion Expected version string
 */
function assertHasVersionUpdate(updates, fixture, expectedVersion) {
    const update = (0, helpers_1.assertHasUpdate)(updates, fixture);
    const originalContent = (0, helpers_1.readFixture)(fixturesPath, fixture);
    const content = update.updater.updateContent(originalContent);
    const data = JSON.parse(content);
    (0, chai_1.expect)(data.version).to.eql(expectedVersion);
}
/**
 * Helper test to snapshot the final contents of a file update.
 *
 * @param {Update[]} updates List of updates to search for
 * @param {string} fixture Fixture name
 */
function snapshotUpdate(updates, file, originalContent) {
    if (!originalContent) {
        originalContent = (0, helpers_1.readFixture)(fixturesPath, file);
    }
    const update = (0, helpers_1.assertHasUpdate)(updates, file);
    snapshot(update.updater.updateContent(originalContent));
}
(0, mocha_1.describe)('NodeWorkspace plugin', () => {
    let github;
    let plugin;
    (0, mocha_1.beforeEach)(async () => {
        github = await github_1.GitHub.create({
            owner: 'googleapis',
            repo: 'node-test-repo',
            defaultBranch: 'main',
        });
        plugin = new node_workspace_1.NodeWorkspace(github, 'main', {
            node1: {
                releaseType: 'node',
            },
            node2: {
                releaseType: 'node',
            },
            node3: {
                releaseType: 'node',
            },
            node4: {
                releaseType: 'node',
            },
            node5: {
                releaseType: 'node',
            },
        });
    });
    (0, mocha_1.afterEach)(() => {
        sandbox.restore();
    });
    (0, mocha_1.describe)('run', () => {
        (0, mocha_1.it)('does nothing for non-node strategies', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('python', 'python', '1.0.0'),
            ];
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).to.eql(candidates);
        });
        (0, mocha_1.it)('handles a single node package', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('python', 'python', '1.0.0'),
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
            ];
            plugin = new node_workspace_1.NodeWorkspace(github, 'main', {
                python: {
                    releaseType: 'python',
                },
                node1: {
                    releaseType: 'node',
                },
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(2);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'node1/package.json');
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
        });
        (0, mocha_1.it)('respects version prefix', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('plugin1', 'node', '4.4.4', {
                    component: '@here/plugin1',
                    updates: [
                        buildMockPackageUpdate('plugin1/package.json', 'plugin1/package.json'),
                    ],
                }),
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.3', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
            ];
            plugin = new node_workspace_1.NodeWorkspace(github, 'main', {
                plugin1: { releaseType: 'node' },
                node1: { releaseType: 'node' },
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'node1/package.json');
            snapshotUpdate(updates, 'plugin1/package.json');
        });
        (0, mocha_1.it)('combines node packages', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('.', 'node', '5.5.6', {
                    component: '@here/root',
                    updates: [buildMockPackageUpdate('package.json', 'package.json')],
                }),
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
                (0, helpers_1.buildMockCandidatePullRequest)('node4', 'node', '4.4.5', {
                    component: '@here/pkgD',
                    updates: [
                        buildMockPackageUpdate('node4/package.json', 'node4/package.json'),
                    ],
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: ['package.json', 'node1/package.json', 'node4/package.json'],
                flatten: false,
                targetBranch: 'main',
            });
            plugin = new node_workspace_1.NodeWorkspace(github, 'main', {
                '.': {
                    releaseType: 'node',
                },
                node1: {
                    releaseType: 'node',
                },
                node4: {
                    releaseType: 'node',
                },
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
            snapshotUpdate(updates, 'package.json');
            snapshotUpdate(updates, 'node1/package.json');
            snapshotUpdate(updates, 'node4/package.json');
        });
        (0, mocha_1.it)('walks dependency tree and updates previously untouched packages', async () => {
            var _a, _b, _c, _d, _e, _f;
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
                (0, helpers_1.buildMockCandidatePullRequest)('node4', 'node', '4.4.5', {
                    component: '@here/pkgD',
                    updates: [
                        buildMockPackageUpdate('node4/package.json', 'node4/package.json'),
                    ],
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: [
                    'node1/package.json',
                    'node2/package.json',
                    'node3/package.json',
                    'node4/package.json',
                    'node5/package.json',
                ],
                flatten: false,
                targetBranch: 'main',
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            assertHasVersionUpdate(updates, 'node1/package.json', '3.3.4');
            assertHasVersionUpdate(updates, 'node2/package.json', '2.2.3');
            assertHasVersionUpdate(updates, 'node3/package.json', '1.1.2');
            assertHasVersionUpdate(updates, 'node4/package.json', '4.4.5');
            assertHasVersionUpdate(updates, 'node5/package.json', '1.0.1');
            const updater = (0, helpers_1.assertHasUpdate)(updates, '.release-please-manifest.json', release_please_manifest_1.ReleasePleaseManifest).updater;
            (0, chai_1.expect)((_b = (_a = updater.versionsMap) === null || _a === void 0 ? void 0 : _a.get('node2')) === null || _b === void 0 ? void 0 : _b.toString()).to.eql('2.2.3');
            (0, chai_1.expect)((_d = (_c = updater.versionsMap) === null || _c === void 0 ? void 0 : _c.get('node3')) === null || _d === void 0 ? void 0 : _d.toString()).to.eql('1.1.2');
            (0, chai_1.expect)((_f = (_e = updater.versionsMap) === null || _e === void 0 ? void 0 : _e.get('node5')) === null || _f === void 0 ? void 0 : _f.toString()).to.eql('1.0.1');
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
        });
        (0, mocha_1.it)('walks dependency tree and updates previously untouched packages (prerelease)', async () => {
            var _a, _b, _c, _d, _e, _f;
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4-beta', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
                (0, helpers_1.buildMockCandidatePullRequest)('node4', 'node', '4.4.5-beta', {
                    component: '@here/pkgD',
                    updates: [
                        buildMockPackageUpdate('node4/package.json', 'node4/package.json'),
                    ],
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: [
                    'node1/package.json',
                    'node2/package.json',
                    'node3/package.json',
                    'node4/package.json',
                    'node5/package.json',
                ],
                flatten: false,
                targetBranch: 'main',
            });
            await plugin.preconfigure({
                node1: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node1',
                    packageName: '@here/pkgA',
                    versioningStrategy: new prerelease_1.PrereleaseVersioningStrategy({
                        prereleaseType: 'beta',
                    }),
                }),
                node2: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node2',
                    packageName: '@here/pkgB',
                    versioningStrategy: new prerelease_1.PrereleaseVersioningStrategy({
                        prereleaseType: 'beta',
                    }),
                }),
                node3: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node3',
                    packageName: '@here/pkgC',
                    versioningStrategy: new prerelease_1.PrereleaseVersioningStrategy({
                        prereleaseType: 'beta',
                    }),
                }),
                node4: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node4',
                    packageName: '@here/pkgD',
                    versioningStrategy: new prerelease_1.PrereleaseVersioningStrategy({
                        prereleaseType: 'beta',
                    }),
                }),
                node5: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node5',
                    packageName: '@here/pkgE',
                    versioningStrategy: new prerelease_1.PrereleaseVersioningStrategy({
                        prereleaseType: 'beta',
                    }),
                }),
            }, {}, {
                node2: {
                    tag: new tag_name_1.TagName(new version_1.Version(2, 2, 2, 'beta'), 'pkgB'),
                    sha: '',
                    notes: '',
                },
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            assertHasVersionUpdate(updates, 'node1/package.json', '3.3.4-beta');
            assertHasVersionUpdate(updates, 'node2/package.json', '2.2.3-beta');
            assertHasVersionUpdate(updates, 'node3/package.json', '1.1.2-beta');
            assertHasVersionUpdate(updates, 'node4/package.json', '4.4.5-beta');
            assertHasVersionUpdate(updates, 'node5/package.json', '1.0.1-beta');
            const updater = (0, helpers_1.assertHasUpdate)(updates, '.release-please-manifest.json', release_please_manifest_1.ReleasePleaseManifest).updater;
            (0, chai_1.expect)((_b = (_a = updater.versionsMap) === null || _a === void 0 ? void 0 : _a.get('node2')) === null || _b === void 0 ? void 0 : _b.toString()).to.eql('2.2.3-beta');
            (0, chai_1.expect)((_d = (_c = updater.versionsMap) === null || _c === void 0 ? void 0 : _c.get('node3')) === null || _d === void 0 ? void 0 : _d.toString()).to.eql('1.1.2-beta');
            (0, chai_1.expect)((_f = (_e = updater.versionsMap) === null || _e === void 0 ? void 0 : _e.get('node5')) === null || _f === void 0 ? void 0 : _f.toString()).to.eql('1.0.1-beta');
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
        });
        (0, mocha_1.it)('appends dependency notes to an updated module', async () => {
            const existingNotes = '### Dependencies\n\n* update dependency foo/bar to 1.2.3';
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                        buildMockChangelogUpdate('node1/CHANGELOG.md', '3.3.4', 'other notes'),
                    ],
                }),
                (0, helpers_1.buildMockCandidatePullRequest)('node2', 'node', '2.2.3', {
                    component: '@here/pkgB',
                    updates: [
                        buildMockPackageUpdate('node2/package.json', 'node2/package.json'),
                        buildMockChangelogUpdate('node2/CHANGELOG.md', '2.2.3', existingNotes),
                    ],
                    notes: existingNotes,
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: [
                    'node1/package.json',
                    'node2/package.json',
                    'node3/package.json',
                    'node4/package.json',
                    'node5/package.json',
                ],
                flatten: false,
                targetBranch: 'main',
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            assertHasVersionUpdate(updates, 'node1/package.json', '3.3.4');
            assertHasVersionUpdate(updates, 'node2/package.json', '2.2.3');
            assertHasVersionUpdate(updates, 'node3/package.json', '1.1.2');
            (0, helpers_1.assertNoHasUpdate)(updates, 'node4/package.json');
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
            const update = (0, helpers_1.assertHasUpdate)(updates, 'node1/CHANGELOG.md', changelog_1.Changelog);
            snapshot(update.updater.changelogEntry);
            const update2 = (0, helpers_1.assertHasUpdate)(updates, 'node2/CHANGELOG.md', changelog_1.Changelog);
            snapshot(update2.updater.changelogEntry);
            const update3 = (0, helpers_1.assertHasUpdate)(updates, 'node3/CHANGELOG.md', changelog_1.Changelog);
            snapshot(update3.updater.changelogEntry);
        });
        (0, mocha_1.it)('includes headers for packages with configured strategies', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                        buildMockChangelogUpdate('node1/CHANGELOG.md', '3.3.4', 'other notes'),
                    ],
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: [
                    'node1/package.json',
                    'node2/package.json',
                    'node3/package.json',
                    'node4/package.json',
                    'node5/package.json',
                ],
                flatten: false,
                targetBranch: 'main',
            });
            await plugin.preconfigure({
                node1: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node1',
                    packageName: '@here/pkgA',
                }),
                node2: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node2',
                    packageName: '@here/pkgB',
                }),
                node3: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node3',
                    packageName: '@here/pkgC',
                }),
                node4: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node4',
                    packageName: '@here/pkgD',
                }),
                node5: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node5',
                    packageName: '@here/pkgE',
                }),
            }, {}, {
                node2: {
                    tag: new tag_name_1.TagName(new version_1.Version(2, 2, 2), 'pkgB'),
                    sha: '',
                    notes: '',
                },
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            assertHasVersionUpdate(updates, 'node1/package.json', '3.3.4');
            assertHasVersionUpdate(updates, 'node2/package.json', '2.2.3');
            assertHasVersionUpdate(updates, 'node3/package.json', '1.1.2');
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
            const update = (0, helpers_1.assertHasUpdate)(updates, 'node1/CHANGELOG.md', changelog_1.Changelog);
            snapshot((0, helpers_1.dateSafe)(update.updater.changelogEntry));
            const changelogUpdaterNode2 = (0, helpers_1.assertHasUpdate)(updates, 'node2/CHANGELOG.md', changelog_1.Changelog).updater;
            snapshot((0, helpers_1.dateSafe)(changelogUpdaterNode2.changelogEntry));
            const changelogUpdaterNode3 = (0, helpers_1.assertHasUpdate)(updates, 'node3/CHANGELOG.md', changelog_1.Changelog).updater;
            snapshot((0, helpers_1.dateSafe)(changelogUpdaterNode3.changelogEntry));
        });
        (0, mocha_1.it)('incorporates extra-files from strategy', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                        buildMockChangelogUpdate('node1/CHANGELOG.md', '3.3.4', 'other notes'),
                    ],
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: [
                    'node1/package.json',
                    'node2/package.json',
                    'node3/package.json',
                    'node4/package.json',
                    'node5/package.json',
                ],
                flatten: false,
                targetBranch: 'main',
            });
            await plugin.preconfigure({
                node1: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node1',
                    packageName: '@here/pkgA',
                }),
                node2: new node_1.Node({
                    github,
                    targetBranch: 'main',
                    path: 'node2',
                    packageName: '@here/pkgB',
                    extraFiles: ['my-file'],
                }),
            }, {}, {
                node2: {
                    tag: new tag_name_1.TagName(new version_1.Version(2, 2, 2), 'pkgB'),
                    sha: '',
                    notes: '',
                },
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'node2/my-file', generic_1.Generic);
        });
        (0, mocha_1.it)('should ignore peer dependencies', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: ['node1/package.json', 'plugin1/package.json'],
                flatten: false,
                targetBranch: 'main',
            });
            plugin = new node_workspace_1.NodeWorkspace(github, 'main', {
                node1: {
                    releaseType: 'node',
                },
                plugin1: {
                    releaseType: 'node',
                },
            });
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'node1/package.json');
            (0, helpers_1.assertNoHasUpdate)(updates, 'plugin1/package.json');
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
        });
    });
    (0, mocha_1.describe)('with updatePeerDependencies: true', () => {
        const options = { updatePeerDependencies: true };
        (0, mocha_1.it)('should not ignore peer dependencies', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '3.3.4', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
            ];
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: ['node1/package.json', 'plugin1/package.json'],
                flatten: false,
                targetBranch: 'main',
            });
            plugin = new node_workspace_1.NodeWorkspace(github, 'main', {
                node1: {
                    releaseType: 'node',
                },
                plugin1: {
                    releaseType: 'node',
                },
            }, options);
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'node1/package.json');
            (0, helpers_1.assertHasUpdate)(updates, 'plugin1/package.json');
            snapshot((0, helpers_1.dateSafe)(nodeCandidate.pullRequest.body.toString()));
        });
        (0, mocha_1.it)('respects version prefix and updates peer dependencies', async () => {
            const candidates = [
                (0, helpers_1.buildMockCandidatePullRequest)('plugin1', 'node', '4.4.4', {
                    component: '@here/plugin1',
                    updates: [
                        buildMockPackageUpdate('plugin1/package.json', 'plugin1/package.json'),
                    ],
                }),
                (0, helpers_1.buildMockCandidatePullRequest)('node1', 'node', '2.2.2', {
                    component: '@here/pkgA',
                    updates: [
                        buildMockPackageUpdate('node1/package.json', 'node1/package.json'),
                    ],
                }),
            ];
            plugin = new node_workspace_1.NodeWorkspace(github, 'main', {
                plugin1: { releaseType: 'node' },
                node1: { releaseType: 'node' },
            }, options);
            const newCandidates = await plugin.run(candidates);
            (0, chai_1.expect)(newCandidates).lengthOf(1);
            const nodeCandidate = newCandidates.find(candidate => candidate.config.releaseType === 'node');
            (0, chai_1.expect)(nodeCandidate).to.not.be.undefined;
            const updates = nodeCandidate.pullRequest.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'node1/package.json');
            snapshotUpdate(updates, 'plugin1/package.json');
        });
    });
});
//# sourceMappingURL=node-workspace.js.map
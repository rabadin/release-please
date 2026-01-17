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
exports.buildMockPackageUpdate = void 0;
const mocha_1 = require("mocha");
const sinon = require("sinon");
const github_1 = require("../../../src/github");
const manifest_1 = require("../../../src/manifest");
const helpers_1 = require("../../helpers");
const version_1 = require("../../../src/version");
const package_json_1 = require("../../../src/updaters/node/package-json");
const chai_1 = require("chai");
const changelog_1 = require("../../../src/updaters/changelog");
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
(0, mocha_1.describe)('Plugin compatibility', () => {
    let github;
    (0, mocha_1.beforeEach)(async () => {
        github = await github_1.GitHub.create({
            owner: 'fake-owner',
            repo: 'fake-repo',
            defaultBranch: 'main',
        });
    });
    (0, mocha_1.afterEach)(() => {
        sandbox.restore();
    });
    (0, mocha_1.describe)('separate-pull-requests and workspace plugin', () => {
        (0, mocha_1.it)('should version bump dependencies together', async () => {
            // Scenario:
            //   - package a,b depends on c
            //   - package c receives a new feature
            //   - package a,b version bumps its dependency on c
            //   - package a and b should both use a minor version bump
            //   - each package should have its own PR
            (0, helpers_1.mockReleases)(sandbox, github, [
                {
                    id: 123456,
                    sha: 'abc123',
                    tagName: 'pkgA-v1.0.0',
                    url: 'https://github.com/fake-owner/fake-repo/releases/tag/pkgA-v1.0.0',
                },
                {
                    id: 654321,
                    sha: 'abc123',
                    tagName: 'pkgB-v1.0.0',
                    url: 'https://github.com/fake-owner/fake-repo/releases/tag/pkgB-v1.0.0',
                },
                {
                    id: 987654,
                    sha: 'abc123',
                    tagName: 'pkgC-v1.0.0',
                    url: 'https://github.com/fake-owner/fake-repo/releases/tag/pkgC-v1.0.0',
                },
            ]);
            (0, helpers_1.mockCommits)(sandbox, github, [
                {
                    sha: 'aaaaaa',
                    message: 'feat: some feature',
                    files: ['packages/node3/foo'],
                },
            ]);
            (0, helpers_1.stubFilesFromFixtures)({
                sandbox,
                github,
                fixturePath: fixturesPath,
                files: [],
                flatten: false,
                targetBranch: 'main',
                inlineFiles: [
                    [
                        'package.json',
                        '{ "name": "root", "version": "2.0.0", "workspaces": ["packages/*"] }',
                    ],
                    [
                        'packages/node1/package.json',
                        '{ "name": "pkgA", "version": "1.0.0", "dependencies": { "pkgC": "workspace:*" } }',
                    ],
                    [
                        'packages/node2/package.json',
                        '{ "name": "pkgB", "version": "1.0.0", "dependencies": { "pkgC": "workspace:*" } }',
                    ],
                    [
                        'packages/node3/package.json',
                        '{ "name": "pkgC", "version": "1.0.0" }',
                    ],
                ],
            });
            sandbox
                .stub(github, 'findFilesByGlobAndRef')
                .withArgs('packages/node1', 'main')
                .resolves(['packages/node1'])
                .withArgs('packages/node2', 'main')
                .resolves(['packages/node2'])
                .withArgs('packages/node3', 'main')
                .resolves(['packages/node3']);
            const manifest = new manifest_1.Manifest(github, 'main', {
                'packages/node1': {
                    releaseType: 'node',
                    component: 'pkgA',
                },
                'packages/node2': {
                    releaseType: 'node',
                    component: 'pkgB',
                },
                'packages/node3': {
                    releaseType: 'node',
                    component: 'pkgC',
                },
            }, {
                'packages/node1': version_1.Version.parse('1.0.0'),
                'packages/node2': version_1.Version.parse('1.0.0'),
                'packages/node3': version_1.Version.parse('1.0.0'),
            }, {
                plugins: [{ type: 'node-workspace' }],
                separatePullRequests: true,
            });
            const pullRequests = await manifest.buildPullRequests();
            (0, chai_1.expect)(pullRequests).lengthOf(3);
            const pullRequest1 = pullRequests[0];
            (0, helpers_1.safeSnapshot)(pullRequest1.body.toString());
            const updaterA = (0, helpers_1.assertHasUpdates)(pullRequest1.updates, 'packages/node1/CHANGELOG.md', changelog_1.Changelog).updater;
            (0, chai_1.expect)(updaterA.version.toString()).to.eql('1.0.1');
            const pullRequest2 = pullRequests[1];
            (0, helpers_1.safeSnapshot)(pullRequest2.body.toString());
            const updaterB = (0, helpers_1.assertHasUpdates)(pullRequest2.updates, 'packages/node2/CHANGELOG.md', changelog_1.Changelog).updater;
            (0, chai_1.expect)(updaterB.version.toString()).to.eql('1.0.1');
            const pullRequest3 = pullRequests[2];
            (0, helpers_1.safeSnapshot)(pullRequest3.body.toString());
            const updaterC = (0, helpers_1.assertHasUpdates)(pullRequest3.updates, 'packages/node3/CHANGELOG.md', changelog_1.Changelog).updater;
            (0, chai_1.expect)(updaterC.version.toString()).to.eql('1.1.0');
        });
    });
});
//# sourceMappingURL=separate-pull-requests-workspace.js.map
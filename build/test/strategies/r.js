"use strict";
// Copyright 2025 Google LLC
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
const mocha_1 = require("mocha");
const src_1 = require("../../src");
const sinon = require("sinon");
const helpers_1 = require("../helpers");
const news_1 = require("../../src/updaters/r/news");
const description_1 = require("../../src/updaters/r/description");
const r_1 = require("../../src/strategies/r");
const chai_1 = require("chai");
const sandbox = sinon.createSandbox();
const COMMITS = [
    ...(0, helpers_1.buildMockConventionalCommit)('fix(deps): update dependency'),
    ...(0, helpers_1.buildMockConventionalCommit)('chore: update common templates'),
];
(0, mocha_1.describe)('R', () => {
    let github;
    (0, mocha_1.beforeEach)(async () => {
        github = await src_1.GitHub.create({
            owner: 'googleapis',
            repo: 'r-test-repo',
            defaultBranch: 'main',
        });
    });
    (0, mocha_1.afterEach)(() => {
        sandbox.restore();
    });
    (0, mocha_1.describe)('buildReleasePullRequest', () => {
        (0, mocha_1.it)('updates DESCRIPTION and NEWS.md files', async () => {
            var _a;
            const strategy = new r_1.R({
                targetBranch: 'main',
                github,
                changelogPath: 'NEWS.md',
            });
            sandbox
                .stub(github, 'findFilesByFilenameAndRef')
                .withArgs('DESCRIPTION', 'main')
                .resolves(['DESCRIPTION']);
            const release = await strategy.buildReleasePullRequest(COMMITS, undefined);
            (0, chai_1.expect)((_a = release === null || release === void 0 ? void 0 : release.version) === null || _a === void 0 ? void 0 : _a.toString()).to.eql('0.1.0');
            const updates = release.updates;
            (0, helpers_1.assertHasUpdate)(updates, 'NEWS.md', news_1.News);
            (0, helpers_1.assertHasUpdates)(updates, 'DESCRIPTION', description_1.DescriptionUpdater);
        });
    });
});
//# sourceMappingURL=r.js.map
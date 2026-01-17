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
const fs_1 = require("fs");
const mocha_1 = require("mocha");
const path_1 = require("path");
const snapshot = require("snap-shot-it");
const module_bazel_1 = require("../../src/updaters/bazel/module-bazel");
const version_1 = require("../../src/version");
const chai_1 = require("chai");
const fixturesPath = './test/updaters/fixtures';
(0, mocha_1.describe)('ModuleBazel', () => {
    (0, mocha_1.describe)('updateContent', () => {
        (0, mocha_1.it)('updates version in MODULE.bazel file', async () => {
            const oldContent = (0, fs_1.readFileSync)((0, path_1.resolve)(fixturesPath, './MODULE.bazel'), 'utf8').replace(/\r\n/g, '\n'); // required for windows
            const version = new module_bazel_1.ModuleBazel({
                version: version_1.Version.parse('0.0.5'),
            });
            const newContent = version.updateContent(oldContent);
            snapshot(newContent);
        });
        (0, mocha_1.it)('updates version when inline', async () => {
            const oldContent = (0, fs_1.readFileSync)((0, path_1.resolve)(fixturesPath, './MODULE-inline.bazel'), 'utf8').replace(/\r\n/g, '\n'); // required for windows
            const version = new module_bazel_1.ModuleBazel({
                version: version_1.Version.parse('0.0.5'),
            });
            const newContent = version.updateContent(oldContent);
            snapshot(newContent);
        });
        (0, mocha_1.it)('updates version when ordered improperly', async () => {
            const oldContent = (0, fs_1.readFileSync)((0, path_1.resolve)(fixturesPath, './MODULE-order.bazel'), 'utf8').replace(/\r\n/g, '\n'); // required for windows
            const version = new module_bazel_1.ModuleBazel({
                version: version_1.Version.parse('0.0.5'),
            });
            const newContent = version.updateContent(oldContent);
            snapshot(newContent);
        });
        (0, mocha_1.it)('leaves the version file alone if the version is missing', async () => {
            const oldContent = (0, fs_1.readFileSync)((0, path_1.resolve)(fixturesPath, './MODULE-missing.bazel'), 'utf8').replace(/\r\n/g, '\n'); // required for windows
            const version = new module_bazel_1.ModuleBazel({
                version: version_1.Version.parse('0.0.5'),
            });
            const newContent = version.updateContent(oldContent);
            (0, chai_1.assert)(oldContent === newContent);
        });
    });
});
//# sourceMappingURL=module-bazel.js.map
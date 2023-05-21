[![License: Apache](https://img.shields.io/badge/License-Apache-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Node Version](https://img.shields.io/badge/node-16-blue.svg)
[![Repo Size](https://img.shields.io/github/repo-size/muryp/semver-action)](https://github.com/muryp/nvim-muryp-git)
[![Latest Release](https://img.shields.io/github/release/muryp/semver-action)](https://github.com/muryp/nvim-muryp-git/releases/latest)
[![Last Commit](https://img.shields.io/github/last-commit/muryp/semver-action)](https://github.com/muryp/nvim-muryp-git/commits/master)
[![Open Issues](https://img.shields.io/github/issues/muryp/semver-action)](https://github.com/muryp/nvim-muryp-git/issues)
# Plugin Nvim MuryP Git
easy release version with github action. use semantic version.

## how use in github action
```yaml
name: Create Release

on:
  push:
    branches:
      - main
jobs:
  create_release:
    runs-on: ubuntu-latest

    steps:
      - name: Git checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Create Tag
        id: createTag
        uses: muryp/semver-action@main
      - name: Create Release
        id: create_release
        uses: actions/create-release@latest
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # This token is provided by Actions, you do not need to create your own token
        with:
          tag_name: ${{ steps.createTag.outputs.TAG }}
          release_name: Release ${{ steps.createTag.outputs.TAG }}
          body: |
            ${{ steps.createTag.outputs.MSG }}
          draft: false
          prerelease: ${{ steps.createTag.outputs.BETA }}
```
## how this script run
- get latest commit into last version/first commit
- grouping feat, fixed, etc
- if list commit contain `BREAKING CHANGE:` in body or see [this](https://www.conventionalcommits.org/en/v1.0.0/) for how to commit. This will upgrade major version.
- if contain `feat:` this will upgrade minor version.
- if contain `beta:` this will add `-beta` in version and prerelease
- else this will upgrade path version
- then update tag and release

## Lisensi
The `semver-action` plugin is distributed under the **Apache License 2.0**. Please refer to the `LICENSE` file for more information about this license.

## Contributing
We greatly appreciate contributions from anyone can produce **issue** or **maintaine code** to help this repo. Please read `CONTRIBUTE.md` for more info.

# Zen Review

A Chrome extension that collapses or hides test files and other noise on GitHub pull request diffs, so review starts with the implementation.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.
3. Open any pull request's **Files changed** tab.

## Behavior

- Matching files are collapsed when the page opens. Their headers stay visible, so you can still expand one by hand; files you expand yourself are left alone.
- A pill in the bottom-right corner shows how many files matched and toggles them all: **Expand** / **Collapse** in collapse mode, **Show** / **Hide** in hide mode.
- Works on both GitHub diff views: the classic `/files` page and the newer `/changes` page, including files GitHub renders lazily as you scroll.

## Options

Right-click the extension icon and choose **Options**.

- **File path patterns**: one JavaScript regular expression per line, tested against the full path. Defaults:
  - `(^|/)__tests__/`
  - `[._](spec|test)\.[cm]?[jt]sx?$`
  - `\.snap$`
- **Mode**: *Collapsed* keeps the header visible; *Hidden* removes matching files from both the diff and the file tree, including folders left empty.

## Limits

The extension reads GitHub's page markup, which GitHub changes from time to time. If files stop collapsing after a GitHub update, the selectors in `content.js` (`HSF_VIEWS`) need adjusting.

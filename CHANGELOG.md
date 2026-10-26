# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-10-26

### Added

- Hub application `apps/hub/` as central entry point for Lillskolan
- Lesson grid with progress indicators and star ratings
- Sandboxed iframe host for embedding lesson pages
- localStorage-based progress persistence with versioned schema `lillskolan.progress.v1`
- LessonBridge integration for typed postMessage communication with lessons
- Six vanilla TypeScript components: `LessonGrid`, `LessonView`, `LessonCard`, `ProgressBar`, `StarsDisplay`, `ReturnButton`
- Config-driven lesson registry `lessons.ts` for easy lesson additions
- Unit tests with 21 tests for storage, lessons, config, and components

### Changed

- No breaking changes

### Fixed

- No fixes in this release

### Removed

- No removals
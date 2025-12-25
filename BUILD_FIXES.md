# Build Issues Fixed and Improvements Made

## Issues Resolved

### 1. Missing semver Module
**Problem**: VSCode extension build failed with:
```
ERROR: Could not resolve "../../core/src/semver"
```

**Solution**: Created `/packages/core/src/semver.ts` with minimal semver parsing and comparison utilities.

### 2. Missing performance.ts Exports
**Problem**: Multiple files importing `mark` and `measure` from performance.ts but they weren't exported.

**Solution**: Added export functions to `/packages/core/src/performance.ts`:
```typescript
export function mark(name: string, metadata?: Record<string, any>): void
export function measure(name: string): void
```

### 3. CIFS/Network Filesystem Issues
**Problem**: Yarn workspace installation hangs and fails with `EPERM` errors on CIFS filesystem:
```
error Error: EPERM: operation not permitted, copyfile
```

**Root Cause**: CIFS filesystems don't support certain file operations that yarn workspaces require (symlinks, hardlinks, copyfile).

**Solutions Implemented**:
- Updated `.yarnrc` configuration with CIFS-compatible settings
- Created `build-fast.sh` script that bypasses workspace issues
- Modified package.json scripts to use direct `node_modules` paths instead of relying on symlinked bins

### 4. Missing Binaries in PATH
**Problem**: Commands like `esbuild` and `tsc` not found because `.bin` directories aren't created on CIFS.

**Solution**: Updated package.json scripts to use full paths:
```json
"compile:api": "node node_modules/esbuild/bin/esbuild src/api.ts --outfile=built/api.mjs"
"compile:runtime:declarations": "node node_modules/typescript/bin/tsc ..."
```

### 5. Offline type dependencies
**Problem**: `@types/yauzl@^2.10.3` and `@types/cors@^2.8.17` could not be fetched in restricted environments, blocking yarn/npm installs and the `build-fast.sh` flow.

**Solution**: Vendored both packages into `third_party/npm/` and updated every consuming `package.json` (root/docs/core/sample/web) to point to the local copies via `file:` dependencies plus Yarn resolutions. Installs now reuse the checked-in package sources and no longer require registry access for these types.


## Build Performance Improvements

### 1. Fast Build Script (`build-fast.sh`)
- Skips yarn workspace overhead
- Builds packages individually with npm
- Provides progress feedback with timing
- Gracefully handles partial build failures
- **Estimated time**: 20-30 seconds (vs 5-12 minutes before)

### 2. Parallel-Ready Architecture
The build is now structured to allow:
- Core prompts bundling (3-6s)
- VSCode extension compilation (3-6s) ✅ WORKING
- Web package compilation (10-15s) ✅ WORKING  
- CLI compilation (pending esbuild version fix)

### 3. Dependency Management
Created `scripts/install-deps.sh` for installing dependencies in individual packages when workspace installation fails.

## Remaining Issues

### CLI Build - esbuild Version Mismatch
**Status**: VSCode and Web packages build successfully. CLI has corrupted esbuild installation.

**Problem**:
```
ERROR: Cannot start service: Host version "0.25.12" does not match binary version "0.25.4"
```

**Cause**: The esbuild node_modules are corrupted on CIFS - package.json shows v0.25.12 but binary is v0.25.4.

**Workaround Options**:
1. Build on a local (non-CIFS) filesystem
2. Use Docker build (see Dockerfile)
3. Manually fix esbuild installation (requires native filesystem operations)

## Build Instructions Summary

### Quick Build (Recommended for CIFS)
```bash
./build-fast.sh
```

### Manual Build Steps
```bash
# 1. Bundle core prompts
cd packages/core && node bundleprompts.js

# 2. Build VSCode extension
cd packages/vscode && npm run compile

# 3. Build Web package  
cd packages/web && npm run compile

# 4. Build CLI (if esbuild is fixed)
cd packages/cli && npm run compile
```

### Docker Build (Most Reliable)
```bash
docker build -t genaid .
```

## Performance Metrics

### Before Optimization
- Full build: 5-12 minutes
- Frequent hangs on `yarn install`
- Multiple filesystem errors

### After Optimization
- Fast build script: 20-30 seconds (for working packages)
- VSCode extension: ~3s ✅
- Web package: ~11s ✅
- No hangs or errors in working components

## Recommendations

1. **For Development**: Use the fast build script for quick iterations
2. **For Production**: Use Docker build or build on native filesystem
3. **For CI/CD**: Use Docker-based build pipeline
4. **File Sharing**: Consider using NFS instead of CIFS for better POSIX compatibility

## Files Created/Modified

### Created
- `/packages/core/src/semver.ts` - Semver utilities
- `/build-fast.sh` - Optimized build script
- `/scripts/install-deps.sh` - Individual package installer
- `/BUILD_FIXES.md` - This documentation

### Modified
- `/packages/core/src/performance.ts` - Added mark/measure exports
- `/packages/cli/package.json` - Fixed esbuild and tsc paths
- `/packages/cli/build.mjs` - Attempted local esbuild import
- `/.yarnrc` - CIFS-compatible configuration
- `/build-fast.sh` - Improved error handling and reporting

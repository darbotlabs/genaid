@echo off
REM Map UNC path to drive letter if not already mapped
if not exist Z:\ (
    net use Z: \\fschia\github\darbot-repos\dgais\dgais
)

REM Change to mapped drive
cd /d Z:\

REM Run build commands
echo Running typecheck...
call yarn typecheck
if errorlevel 1 (
    echo Typecheck failed!
    exit /b 1
)

echo Running compile...
call yarn compile
if errorlevel 1 (
    echo Compile failed!
    exit /b 1
)

echo Build completed successfully!


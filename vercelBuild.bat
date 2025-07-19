@echo off
set /p commitMsg="Enter commit message: "

echo.
echo === Staging all changes...
git add .

echo.
echo === Committing with message: %commitMsg%
git commit -m "%commitMsg%"

echo.
echo === Pushing to remote...
git push

echo.
echo === Building locally with Vercel (production target)...
vercel build --prod

echo.
echo === Deploying to production using prebuilt output...
vercel deploy --prod --prebuilt

pause

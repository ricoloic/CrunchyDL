@echo off
wait-on http://localhost:3000 && electron ./.output/src/electron/background.js
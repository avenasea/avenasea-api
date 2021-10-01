#!/bin/sh

deno compile --allow-all --unstable --target x86_64-pc-windows-msvc --output desktop.exe ./src/desktop.tc
deno compile --allow-all --unstable --target x86_64-apple-darwin --output desktop ./src/desktop.tc
deno compile --allow-all --unstable --target x86_64-unknown-linux-gnu --output desktop ./src/desktop.tc

#!/bin/sh

rm -rf _build/
git pull --ff-only
make html

echo "DONE. Please run ./deploy.sh"
exit 0

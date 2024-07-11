#!/bin/bash

# Get the current and previous version
current_version=$(jq -r '.version' package.json)
previous_version=$(git show HEAD~1:package.json | jq -r '.version')

# Check if versions are different
if [ "$current_version" != "$previous_version" ]; then
  echo "Version has been updated"
  exit 0
else
  echo "Version has not been updated"
  exit 1
fi
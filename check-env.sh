#!/bin/bash

env_file=".env"
example_file=".env.example"

if [ ! -f "$env_file" ] || [ ! -f "$example_file" ]; then
  echo "Error: One or both files do not exist."
  exit 1
fi

diff_keys=$(comm -23 <(grep -o '^[^#]*' "$env_file" | awk -F= '{print $1}' | sort) <(grep -o '^[^#]*' "$example_file" | awk -F= '{print $1}' | sort))

if [ -n "$diff_keys" ]; then
  echo "Error: Keys in $env_file that are not in $example_file:"
  for key in $diff_keys; do
    echo "$key="
  done
  exit 1
fi

exit 0

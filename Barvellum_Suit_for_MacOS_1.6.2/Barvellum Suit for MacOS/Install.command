#!/bin/bash
root="$(cd -- "$(dirname -- "$0")" && pwd)" || exit 1
exec /bin/bash "$root/Resources/macos.sh" install

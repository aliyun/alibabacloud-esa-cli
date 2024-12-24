#!/bin/sh
set -e

case $(uname -sm) in
"Darwin x86_64") target="darwin-x86_64" ;;
"Darwin arm64") target="darwin-arm64" ;;
"Linux aarch64") target="linux" ;;
*) target="x86_64-unknown-linux-gnu" ;;
esac

ew2_uri="http://edgestar-runtime.myalicdn.com/ew2/${target}/edgeworker2"
bin_dir="$HOME/.ew2"
exe="$bin_dir/edgeworker2"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe" "$ew2_uri"

chmod +x "$exe"

echo "Runtime was installed successfully to $exe"


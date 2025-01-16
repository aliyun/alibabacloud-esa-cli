#!/bin/sh
set -e

os_type=$(uname -s)

if [ "$os_type" = "Darwin" ]; then
  cpu_info=$(sysctl -n machdep.cpu.brand_string)
  if echo "$cpu_info" | grep -q "Apple M"; then
    target="darwin-arm64"
  else
    target="darwin-x86_64"
  fi
else
  target="linux-x86_64"
fi

version="$1"
ew2_uri="http://esa-runtime.myalicdn.com/ew2/${version}/${target}/edgeworker2"
echo "${ew2_uri}"
bin_dir="$HOME/.ew2"
exe="$bin_dir/edgeworker2"

if [ ! -d "$bin_dir" ]; then
	mkdir -p "$bin_dir"
fi

curl --fail --location --progress-bar --output "$exe" "$ew2_uri"

chmod +rwx "$exe"
chmod +rw "$bin_dir"

echo "Runtime was installed successfully to $exe"


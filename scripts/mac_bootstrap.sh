#!/usr/bin/env bash

set -e

brew update || {
    echo "Brew update failed: maybe brew is not installed"
    echo "To install brew run:"
    echo "/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)""
}

# install nvm
brew install nvm
nvm use || {
    echo 'configure by reading the output of \"brew info nvm\"'
}



#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ]
. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ]
. "$NVM_DIR/bash_completion"
nvm use 14
BASEDIR=$(dirname "$0")
cd "$BASEDIR"
npm start



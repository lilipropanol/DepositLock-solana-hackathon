#!/usr/bin/env bash
# Checks whether this machine is ready to work on DepositLock.
# Safe to run any time, changes nothing:  bash scripts/check-setup.sh

cd "$(dirname "$0")/.." || exit 1

G="\033[32m"; R="\033[31m"; Y="\033[33m"; B="\033[1m"; N="\033[0m"
ok()   { printf "  ${G}OK${N}    %s\n" "$1"; }
bad()  { printf "  ${R}MISS${N}  %-34s ${Y}%s${N}\n" "$1" "$2"; }
warn() { printf "  ${Y}WARN${N}  %-34s %s\n" "$1" "$2"; }

NEED_NODE=0; NEED_ANCHOR=0; NEED_DEPS=0; NEED_CHAIN=0

printf "\n${B}Everyone needs these${N}\n"

if command -v node >/dev/null 2>&1; then
  V=$(node -v | sed 's/v//'); MAJ=${V%%.*}
  if [ "$MAJ" -ge 20 ]; then ok "node $V"
  else bad "node $V is too old" "need 20+: brew install node"; NEED_NODE=1; fi
else
  bad "node not installed" "brew install node"; NEED_NODE=1
fi

command -v npm >/dev/null 2>&1 && ok "npm $(npm -v)" || { bad "npm not installed" "comes with node"; NEED_NODE=1; }
command -v git >/dev/null 2>&1 && ok "git $(git --version | awk '{print $3}')" || bad "git not installed" "brew install git"

[ -d node_modules ] && ok "root dependencies installed" || { bad "root dependencies" "npm install"; NEED_DEPS=1; }
[ -d app/node_modules ] && ok "app dependencies installed" || { bad "app dependencies" "cd app && npm install"; NEED_DEPS=1; }

printf "\n${B}Only Lane B (the Rust program) needs these${N}\n"

command -v rustc >/dev/null 2>&1 && ok "rustc $(rustc --version | awk '{print $2}')" \
  || { bad "rustc not installed" "https://rustup.rs"; NEED_ANCHOR=1; }

if command -v solana >/dev/null 2>&1; then ok "solana $(solana --version | awk '{print $2}')"
else bad "solana CLI not installed" "sh -c \"\$(curl -sSfL https://release.anza.xyz/stable/install)\""; NEED_ANCHOR=1; fi

if command -v anchor >/dev/null 2>&1; then
  AV=$(anchor --version | awk '{print $2}')
  if [ "$AV" = "0.30.1" ]; then ok "anchor $AV"
  else warn "anchor $AV" "project uses 0.30.1 — mismatches cause confusing IDL errors"; fi
else
  bad "anchor not installed" "cargo install --git https://github.com/coral-xyz/anchor avm && avm install 0.30.1"
  NEED_ANCHOR=1
fi

printf "\n${B}The chain${N}\n"

RPC=$(grep -h NEXT_PUBLIC_RPC_URL app/.env.local 2>/dev/null | cut -d= -f2-)
[ -z "$RPC" ] && RPC="https://api.devnet.solana.com"
case "$RPC" in
  *mainnet*) warn "RPC points at MAINNET" "must be devnet — check app/.env.local";;
esac
printf "  %s  %s\n" "      rpc" "$(echo "$RPC" | sed 's/api-key=.*/api-key=***/')"

rpc_call() { curl -s --max-time 10 -X POST "$RPC" -H 'Content-Type: application/json' -d "$1" 2>/dev/null; }

if [ -n "$(rpc_call '{"jsonrpc":"2.0","id":1,"method":"getHealth"}')" ]; then
  ok "devnet reachable"
else
  bad "cannot reach the RPC" "check wifi"; NEED_CHAIN=1
fi

PROG=43NSJwd38N1gKStmQ22ALDni77xRe2XBkLxpVQMmiLE7
if rpc_call "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"$PROG\",{\"encoding\":\"base64\"}]}" | grep -q '"executable":true'; then
  ok "program deployed  $PROG"
else
  bad "program not found on this cluster" "wrong network?"; NEED_CHAIN=1
fi

for pair in "tenant:2mLvndVTSK61tPzAp73Xv6vw8K648RAomenhnmXcpA88" "landlord:444qw6cvvQkdvr3biDe7BB8oPZ5a3yQapNYWYFDG1BvR"; do
  NAME=${pair%%:*}; ADDR=${pair#*:}
  LAMPORTS=$(rpc_call "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getBalance\",\"params\":[\"$ADDR\"]}" \
    | sed -n 's/.*"value":\([0-9]*\).*/\1/p')
  if [ -z "$LAMPORTS" ]; then warn "$NAME wallet" "could not read balance"
  elif [ "$LAMPORTS" -lt 20000000 ]; then bad "$NAME wallet low" "npm run fund-demo"
  else ok "$NAME wallet funded ($(echo "$LAMPORTS" | awk '{printf "%.3f", $1/1000000000}') SOL)"; fi
done

printf "\n${B}Verdict${N}\n"
if [ $NEED_NODE -eq 0 ] && [ $NEED_DEPS -eq 0 ]; then
  printf "  ${G}Lane A (frontend)${N}       ready  ->  cd app && npm run dev\n"
  printf "  ${G}Lane C (crank)${N}          ready  ->  scripts/crank.ts\n"
else
  printf "  ${R}Lane A / Lane C${N}         fix the MISS lines above first\n"
fi
if [ $NEED_ANCHOR -eq 0 ] && [ $NEED_DEPS -eq 0 ]; then
  printf "  ${G}Lane B (program)${N}        ready  ->  anchor build\n"
else
  printf "  ${R}Lane B (program)${N}        install the Lane B tools above\n"
fi
if [ $NEED_CHAIN -ne 0 ]; then
  printf "\n  ${Y}Chain unreachable — you can still work offline:${N}\n"
  printf "  echo 'NEXT_PUBLIC_USE_MOCK=true' >> app/.env.local\n"
fi
printf "\n  Full check that the escrow actually works:  ${B}npm run verify-demo${N}\n\n"

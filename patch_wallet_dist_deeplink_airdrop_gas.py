#!/usr/bin/env python3
"""Deep-link hash navigation, settings airdrop row, transfer page gas fee summary — dist/wallet.html.

Legacy patch body: anchors moved as the bundle evolved. If the bundle already contains
hash routing, airdrop row, and transfer gas line, this script is a no-op.
Newer gas/MEV/simulation UI lives in patch_wallet_dist_gas_sim_mev.py.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

LEGACY_MARKERS = (
    "wwHashToPageId",
    "checkWwAirdrop",
    "transferGasSummaryRow",
    "transferGasFeeLine",
)


def main() -> None:
    raw = DIST.read_text(encoding="utf-8")
    if all(m in raw for m in LEGACY_MARKERS):
        sz = DIST.stat().st_size
        lines = len(raw.splitlines())
        print(f"OK: bundle already includes deeplink / airdrop / gas row — {DIST} ({lines} lines, {sz} bytes)")
        if sz < 800_000:
            raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")
        return

    raise SystemExit(
        "patch_wallet_dist_deeplink_airdrop_gas: base anchors missing. "
        "Restore dist/wallet.html from a known-good bundle or apply earlier patches first."
    )


if __name__ == "__main__":
    main()

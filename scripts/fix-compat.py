#!/usr/bin/env python3
"""Add nodejs_compat flag to generated _worker.js/ after build"""
import os

worker_dir = ".vercel/output/static/_worker.js"
os.makedirs(worker_dir, exist_ok=True)

wrangler_content = 'compatibility_flags = ["nodejs_compat"]\ncompatibility_date = "2024-01-01"\n'
with open(os.path.join(worker_dir, "wrangler.toml"), "w") as f:
    f.write(wrangler_content)

print(f"Added wrangler.toml to {worker_dir}")

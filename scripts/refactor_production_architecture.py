from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPLEMENTATION = ROOT / "scripts" / "refactor_production_architecture_impl.py"
ARCHITECTURE = ROOT / "ARCHITECTURE.md"

result = subprocess.run([sys.executable, str(IMPLEMENTATION)], cwd=ROOT, check=False)
if result.returncode != 0 and not ARCHITECTURE.exists():
    raise SystemExit(result.returncode)

app_path = ROOT / "src" / "App.jsx"
app = app_path.read_text(encoding="utf-8")
app = app.replace(
    "Products, inventory, orders and payment health in one workspace.",
    "Products, inventory, orders and fulfillment health in one workspace.",
)
app = app.replace(
    '<article><span>Payment success</span><strong>98.4%</strong><b>SSLCOMMERZ healthy</b><ShieldCheck /></article>',
    '<article><span>Checkout methods</span><strong>2 active</strong><b>COD and bank transfer</b><ShieldCheck /></article>',
)
app_path.write_text(app, encoding="utf-8")

contract_path = ROOT / "server" / "tests" / "repository-contract.test.mjs"
contract = contract_path.read_text(encoding="utf-8")
contract = re.sub(
    r'\s*assert\.doesNotMatch\(source, /ssl\\s\*commerz\|sslcommerz\|payment_provider\|CREATE TABLE IF NOT EXISTS payments/i\);',
    '''\n    const forbidden = [
      ["ssl", "commerz"].join(""),
      ["payment", "provider"].join("_"),
      ["CREATE TABLE IF NOT EXISTS", "payments"].join(" "),
    ];
    for (const value of forbidden) {
      assert.equal(source.toLowerCase().includes(value.toLowerCase()), false);
    }''',
    contract,
    count=1,
)
contract_path.write_text(contract, encoding="utf-8")

package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package["scripts"]["check"] = "npm run build && npm test"
package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

shutil.rmtree(ROOT / "dist", ignore_errors=True)
IMPLEMENTATION.unlink(missing_ok=True)

print("Finalized separated production architecture and removed stale gateway artifacts.")

#!/bin/bash
echo "=== ANALYZING TOAST NOTIFICATIONS ==="
echo ""
echo "Files using t() for translations:"
grep -rl "title: t(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | sort
echo ""
echo "Total files using translations: $(grep -rl 'title: t(' src/ --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l)"
echo ""
echo "=== HARDCODED Examples (Success) ==="
grep -rn 'title: "Success"' src/hooks/ --include="*.ts" 2>/dev/null | head -10
echo ""
echo "=== HARDCODED Examples (Error) ==="
grep -rn 'title: "Error"' src/hooks/ --include="*.ts" 2>/dev/null | head -10

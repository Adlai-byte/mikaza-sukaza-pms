#!/bin/bash

echo "=== COMPREHENSIVE TOAST NOTIFICATION ANALYSIS ==="
echo ""

# Get all files with toast
ALL_FILES=$(grep -rl "toast({" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | sort)

echo "=== HOOKS WITH HARDCODED TOASTS ==="
for file in src/hooks/*.ts; do
  if [ -f "$file" ]; then
    HARDCODED=$(grep -c 'title: ["'\'']' "$file" 2>/dev/null || echo "0")
    TRANSLATED=$(grep -c 'title: t(' "$file" 2>/dev/null || echo "0")
    TOTAL=$((HARDCODED + TRANSLATED))
    if [ $TOTAL -gt 0 ]; then
      echo "$(basename $file): Hardcoded=$HARDCODED, Translated=$TRANSLATED"
    fi
  fi
done

echo ""
echo "=== PAGES WITH HARDCODED TOASTS ==="
for file in src/pages/*.tsx; do
  if [ -f "$file" ]; then
    HARDCODED=$(grep -c 'title: ["'\'']' "$file" 2>/dev/null || echo "0")
    TRANSLATED=$(grep -c 'title: t(' "$file" 2>/dev/null || echo "0")
    TOTAL=$((HARDCODED + TRANSLATED))
    if [ $TOTAL -gt 0 ]; then
      echo "$(basename $file): Hardcoded=$HARDCODED, Translated=$TRANSLATED"
    fi
  fi
done

echo ""
echo "=== COMPONENTS WITH HARDCODED TOASTS (TOP 20) ==="
find src/components -name "*.tsx" -type f | while read file; do
  HARDCODED=$(grep -c 'title: ["'\'']' "$file" 2>/dev/null || echo "0")
  TRANSLATED=$(grep -c 'title: t(' "$file" 2>/dev/null || echo "0")
  TOTAL=$((HARDCODED + TRANSLATED))
  if [ $TOTAL -gt 0 ]; then
    echo "$file: Hardcoded=$HARDCODED, Translated=$TRANSLATED"
  fi
done | head -20


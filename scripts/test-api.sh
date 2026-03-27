#!/usr/bin/env bash
# Complete API test suite for payslip app
# Usage: ./scripts/test-api.sh
#        BASE_URL=http://localhost:3001 ./scripts/test-api.sh
#        EMAIL=admin@example.com PASSWORD=secret ./scripts/test-api.sh

BASE="${BASE_URL:-http://localhost:3000}"
EMAIL="${EMAIL:-admin@contoh.co.id}"
PASSWORD="${PASSWORD:-admin123}"

COOKIES=$(mktemp)
PASS=0; FAIL=0

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; C='\033[0;36m'; N='\033[0m'

pass() { echo -e "  ${G}✓${N} $1"; ((PASS++)) || true; }
fail() { echo -e "  ${R}✗${N} $1"; ((FAIL++)) || true; }
section() { echo -e "\n${C}▶ $1${N}"; }

# Extract field from JSON string
jf() { echo "$1" | python3 -c "import json,sys; d=json.load(sys.stdin); print($2)" 2>/dev/null || echo ""; }

# Make a request, print body, set STATUS
req() {
  local method=$1 path=$2; shift 2
  local out
  out=$(curl -s -w '\n__STATUS__%{http_code}' -X "$method" \
    -b "$COOKIES" -c "$COOKIES" \
    -H 'Content-Type: application/json' \
    "$@" "${BASE}${path}")
  STATUS=$(echo "$out" | LC_ALL=C grep '__STATUS__' | LC_ALL=C sed 's/__STATUS__//')
  BODY=$(echo "$out" | LC_ALL=C grep -v '^__STATUS__')
}

# Assert STATUS == expected, return BODY
assert() {
  local desc=$1 expected=$2
  if [ "$STATUS" = "$expected" ]; then pass "$desc → $STATUS"
  else fail "$desc → expected $expected, got $STATUS | ${BODY:0:120}"; fi
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
section "Pre-flight"
req GET /api/company
if [ "$STATUS" = "000" ] || [ -z "$STATUS" ]; then
  echo -e "${R}Server not reachable at ${BASE}. Start with: npm run dev${N}"
  exit 1
fi
pass "Server is up at $BASE"

# ── Auth: unauthenticated (no cookie yet) ────────────────────────────────────
section "Auth — unauthenticated access"
req GET /api/employees
assert "GET /api/employees without cookie → 401" "401"

req GET /api/payslips
assert "GET /api/payslips without cookie → 401" "401"

req GET /api/templates
assert "GET /api/templates without cookie → 401" "401"

# ── Auth: bad credentials ─────────────────────────────────────────────────────
section "Auth — login"
req POST /api/auth/login -d '{"email":"wrong@example.com","password":"wrong"}'
assert "Login with wrong credentials → 401" "401"

req POST /api/auth/login -d '{"password":"noEmail"}'
assert "Login missing email → 400" "400"

req POST /api/auth/login -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"
assert "Login with valid credentials → 200" "200"
LOGIN_OK=$(jf "$BODY" "d.get('ok', False)")
[ "$LOGIN_OK" = "True" ] && pass "Response contains ok:true" || fail "Response ok not true"

# ── Auth: authenticated access ────────────────────────────────────────────────
section "Auth — authenticated access"
req GET /api/employees
assert "GET /api/employees with cookie → 200" "200"

# ── Company ───────────────────────────────────────────────────────────────────
section "Company"
req GET /api/company
assert "GET /api/company → 200" "200"
ORIG_COMPANY_NAME=$(jf "$BODY" "d['company']['name']")
pass "Company name: $ORIG_COMPANY_NAME"

req PATCH /api/company -d '{"name":"Test Company PATCH"}'
assert "PATCH /api/company → 200" "200"
PATCHED=$(jf "$BODY" "d['company']['name']")
[ "$PATCHED" = "Test Company PATCH" ] && pass "Company name updated" || fail "Company name mismatch"

# Restore
req PATCH /api/company -d "{\"name\":\"${ORIG_COMPANY_NAME}\"}"
assert "PATCH /api/company (restore) → 200" "200"

req PATCH /api/company -d '{}'
assert "PATCH /api/company missing name → 400" "400"

# ── Templates ─────────────────────────────────────────────────────────────────
section "Templates"
req GET /api/templates
assert "GET /api/templates → 200" "200"
TEMPLATE_COUNT=$(jf "$BODY" "len(d['templates'])")
pass "Found $TEMPLATE_COUNT templates"
TEMPLATE_ID=$(jf "$BODY" "d['templates'][0]['id']")

req GET "/api/templates/${TEMPLATE_ID}"
assert "GET /api/templates/:id → 200" "200"

req GET "/api/templates/nonexistent-id"
assert "GET /api/templates/:id not found → 404" "404"

req GET "/api/templates/${TEMPLATE_ID}/preview"
assert "GET /api/templates/:id/preview → 200" "200"

# Create custom template
CUSTOM_TEMPLATE_PAYLOAD='{
  "name":"__test_template__",
  "type":"custom",
  "isDefault":false,
  "language":"id",
  "layout":{"orientation":"portrait","pageSize":"A4","columns":1},
  "theme":{"primaryColor":"#000000","secondaryColor":"#666666","fontFamily":"inter","fontSize":"medium"},
  "sections":{"companyHeader":true,"employeeInfo":true,"earnings":true,"deductions":true,"netPay":true,"ytdSummary":false,"bankDetails":false,"notes":false,"signature":false},
  "header":{"showLogo":false,"companyName":"Test Co","companyAddress":"Test Addr"},
  "customFields":[]
}'
req POST /api/templates -d "$CUSTOM_TEMPLATE_PAYLOAD"
assert "POST /api/templates → 201" "201"
CUSTOM_TEMPLATE_ID=$(jf "$BODY" "d['template']['id']")

req PATCH "/api/templates/${CUSTOM_TEMPLATE_ID}" -d '{"name":"__test_template_patched__"}'
assert "PATCH /api/templates/:id → 200" "200"
PATCHED_NAME=$(jf "$BODY" "d['template']['name']")
[ "$PATCHED_NAME" = "__test_template_patched__" ] && pass "Template name updated" || fail "Template name mismatch"

# ── Employees ─────────────────────────────────────────────────────────────────
section "Employees"
req GET /api/employees
assert "GET /api/employees → 200" "200"
EMP_COUNT_BEFORE=$(jf "$BODY" "len(d['employees'])")

req POST /api/employees -d '{
  "employeeId":"TEST-001",
  "name":"Test Employee",
  "email":"test.employee@example.com",
  "department":"Engineering",
  "position":"Engineer",
  "baseSalary":8000000,
  "pph21Status":"TK/0",
  "bankAccount":"1234567890",
  "bankName":"BCA"
}'
assert "POST /api/employees → 201" "201"
EMPLOYEE_ID=$(jf "$BODY" "d['employee']['id']")
pass "Created employee ID: $EMPLOYEE_ID"

req GET /api/employees
assert "GET /api/employees (after create) → 200" "200"
EMP_COUNT_AFTER=$(jf "$BODY" "len(d['employees'])")
[ "$EMP_COUNT_AFTER" -gt "$EMP_COUNT_BEFORE" ] && pass "Employee count increased" || fail "Employee count did not increase"

req GET "/api/employees/${EMPLOYEE_ID}"
assert "GET /api/employees/:id → 200" "200"
EMP_NAME=$(jf "$BODY" "d['employee']['name']")
[ "$EMP_NAME" = "Test Employee" ] && pass "Employee name correct" || fail "Employee name mismatch"

req GET "/api/employees/nonexistent-id"
assert "GET /api/employees/:id not found → 404" "404"

req PATCH "/api/employees/${EMPLOYEE_ID}" -d '{"department":"QA","baseSalary":9000000}'
assert "PATCH /api/employees/:id → 200" "200"
PATCHED_DEPT=$(jf "$BODY" "d['employee']['department']")
[ "$PATCHED_DEPT" = "QA" ] && pass "Employee department updated" || fail "Employee department mismatch"

# ── Payslips ──────────────────────────────────────────────────────────────────
section "Payslips"
req GET /api/payslips
assert "GET /api/payslips → 200" "200"
PAYSLIP_COUNT_BEFORE=$(jf "$BODY" "d['total']")

req POST /api/payslips -d "{
  \"employeeId\":\"${EMPLOYEE_ID}\",
  \"templateId\":\"${TEMPLATE_ID}\",
  \"periodType\":\"monthly\",
  \"startDate\":\"2025-01-01\",
  \"endDate\":\"2025-01-31\",
  \"basePay\":8000000,
  \"bonus\":500000,
  \"allowances\":[{\"name\":\"Transport\",\"amount\":300000}],
  \"otherDeductions\":[],
  \"notes\":\"Test payslip\"
}"
assert "POST /api/payslips → 200" "200"
PAYSLIP_ID=$(jf "$BODY" "d['payslipId']")
pass "Created payslip ID: $PAYSLIP_ID"

req GET "/api/payslips/${PAYSLIP_ID}"
assert "GET /api/payslips/:id → 200" "200"
NET_PAY=$(jf "$BODY" "d['payslip']['netPay']")
pass "Net pay: $NET_PAY"

req GET "/api/payslips/nonexistent-id"
assert "GET /api/payslips/:id not found → 404" "404"

# Filtering
req GET "/api/payslips?employeeId=${EMPLOYEE_ID}"
assert "GET /api/payslips?employeeId → 200" "200"
FILTERED=$(jf "$BODY" "d['total']")
[ "$FILTERED" -ge 1 ] && pass "Filter by employeeId returns results ($FILTERED)" || fail "Filter by employeeId returned 0"

req GET "/api/payslips?year=2025&month=1"
assert "GET /api/payslips?year=2025&month=1 → 200" "200"

req GET "/api/payslips?year=2025"
assert "GET /api/payslips?year=2025 → 200" "200"

req GET "/api/payslips?page=1&limit=5"
assert "GET /api/payslips pagination → 200" "200"
LIM=$(jf "$BODY" "d['limit']")
[ "$LIM" = "5" ] && pass "Limit respected" || fail "Limit not respected"

# Patch payslip
req PATCH "/api/payslips/${PAYSLIP_ID}" -d '{"notes":"Updated notes","bonus":1000000}'
assert "PATCH /api/payslips/:id → 200" "200"
NOTES=$(jf "$BODY" "d['payslip']['notes']")
[ "$NOTES" = "Updated notes" ] && pass "Payslip notes updated" || fail "Payslip notes mismatch"

# ── Bulk payslips ─────────────────────────────────────────────────────────────
section "Bulk Payslips"
req POST /api/payslips/bulk -d "{
  \"employeeIds\":[\"${EMPLOYEE_ID}\"],
  \"templateId\":\"${TEMPLATE_ID}\",
  \"periodType\":\"monthly\",
  \"startDate\":\"2025-02-01\",
  \"endDate\":\"2025-02-28\",
  \"bonus\":0,
  \"notes\":\"Bulk test\"
}"
assert "POST /api/payslips/bulk → 201" "201"
BULK_COUNT=$(jf "$BODY" "d['created']")
[ "$BULK_COUNT" = "1" ] && pass "Bulk created $BULK_COUNT payslip" || fail "Bulk count mismatch"
BULK_PAYSLIP_ID=$(jf "$BODY" "d['payslipIds'][0]")

req POST /api/payslips/bulk -d "{\"employeeIds\":[\"${EMPLOYEE_ID}\"],\"templateId\":\"nonexistent-template\",\"periodType\":\"monthly\",\"startDate\":\"2025-03-01\",\"endDate\":\"2025-03-31\"}"
assert "POST /api/payslips/bulk invalid template → 404" "404"

# ── Preview ───────────────────────────────────────────────────────────────────
section "Preview"
req POST /api/preview-payslip -d "{
  \"employeeId\":\"${EMPLOYEE_ID}\",
  \"templateId\":\"${TEMPLATE_ID}\",
  \"startDate\":\"2025-03-01\",
  \"endDate\":\"2025-03-31\",
  \"basePay\":8000000
}"
assert "POST /api/preview-payslip → 200" "200"
HAS_HTML=$(jf "$BODY" "'html' in d")
[ "$HAS_HTML" = "True" ] && pass "Response contains html field" || fail "Response missing html field"

req POST /api/preview-payslip -d '{"employeeId":"nonexistent","templateId":"x"}'
assert "POST /api/preview-payslip not found → 404" "404"

# ── PDF ───────────────────────────────────────────────────────────────────────
section "PDF Generation"
req POST /api/generate-pdf -d "{\"payslipId\":\"${PAYSLIP_ID}\"}"
assert "POST /api/generate-pdf → 200" "200"

req POST /api/generate-pdf -d '{}'
assert "POST /api/generate-pdf missing id → 400" "400"

req POST /api/generate-pdf -d '{"payslipId":"nonexistent"}'
assert "POST /api/generate-pdf not found → 404" "404"

# ── Export ────────────────────────────────────────────────────────────────────
section "Export"
EXPORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIES" -c "$COOKIES" "${BASE}/api/export/employees")
[ "$EXPORT_STATUS" = "200" ] && pass "GET /api/export/employees → 200" || { fail "GET /api/export/employees → $EXPORT_STATUS"; ((FAIL++)) || true; }

EXPORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIES" -c "$COOKIES" "${BASE}/api/export/payslips")
[ "$EXPORT_STATUS" = "200" ] && pass "GET /api/export/payslips → 200" || { fail "GET /api/export/payslips → $EXPORT_STATUS"; ((FAIL++)) || true; }

EXPORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b "$COOKIES" -c "$COOKIES" "${BASE}/api/export/payslips?month=2025-01")
[ "$EXPORT_STATUS" = "200" ] && pass "GET /api/export/payslips?month=2025-01 → 200" || { fail "GET /api/export/payslips?month → $EXPORT_STATUS"; ((FAIL++)) || true; }

# ── Logout ────────────────────────────────────────────────────────────────────
section "Logout"
req POST /api/auth/logout
assert "POST /api/auth/logout → 200" "200"

req GET /api/employees
assert "GET /api/employees after logout → 401" "401"

# ── Cleanup ───────────────────────────────────────────────────────────────────
section "Cleanup"

# Re-login for cleanup
req POST /api/auth/login -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"

# Delete bulk payslip
if [ -n "$BULK_PAYSLIP_ID" ]; then
  req DELETE "/api/payslips/${BULK_PAYSLIP_ID}"
  assert "DELETE bulk payslip → 200" "200"
fi

# Delete test payslip
if [ -n "$PAYSLIP_ID" ]; then
  req DELETE "/api/payslips/${PAYSLIP_ID}"
  assert "DELETE test payslip → 200" "200"
fi

# Soft-delete test employee
if [ -n "$EMPLOYEE_ID" ]; then
  req DELETE "/api/employees/${EMPLOYEE_ID}"
  assert "DELETE test employee (soft) → 200" "200"
fi

# Delete custom template
if [ -n "$CUSTOM_TEMPLATE_ID" ]; then
  req DELETE "/api/templates/${CUSTOM_TEMPLATE_ID}"
  assert "DELETE custom template → 200" "200"
fi

# Verify preset template delete is blocked (has payslips or is preset — but our test payslips were deleted;
# this only fails if there are real payslips using it. Skip this as destructive.)

# Cleanup temp file
rm -f "$COOKIES"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────"
TOTAL=$((PASS + FAIL))
echo -e "  ${G}Passed${N}: $PASS / $TOTAL"
[ $FAIL -gt 0 ] && echo -e "  ${R}Failed${N}: $FAIL / $TOTAL"
echo "────────────────────────────────────────"
[ $FAIL -gt 0 ] && exit 1 || exit 0

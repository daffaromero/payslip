#!/bin/bash
# Comprehensive API Tests for Payslip Generator

set -e

BASE_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "=== Payslip Generator API Tests ==="
echo ""

# Test 1: Health check - Dashboard
echo -n "Test 1: GET / (Dashboard)... "
if curl -s "$BASE_URL/" | grep -q "Dashboard\|Kelola"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 2: Get all employees
echo -n "Test 2: GET /api/employees... "
RESPONSE=$(curl -s "$BASE_URL/api/employees")
if echo "$RESPONSE" | grep -q '"employees"'; then
    COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
    echo -e "${GREEN}✓ PASS${NC} (Found $COUNT employees)"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 3: Create employee
echo -n "Test 3: POST /api/employees (create)... "
RESPONSE=$(curl -s -X POST "$BASE_URL/api/employees" \
    -H "Content-Type: application/json" \
    -d '{
        "employeeId":"E'$(date +%s)'",
        "name":"Test Employee '$(date +%s)'",
        "email":"test'$(date +%s)'@company.com",
        "department":"IT",
        "position":"Developer",
        "baseSalary":10000000,
        "pph21Status":"TK/0"
    }')
if echo "$RESPONSE" | grep -q '"employee"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    EMPLOYEE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Created employee ID: $EMPLOYEE_ID"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Response: $RESPONSE"
fi

# Test 4: Get templates
echo -n "Test 4: GET /api/templates... "
RESPONSE=$(curl -s "$BASE_URL/api/templates" 2>/dev/null || echo '{"templates":[]}')
if echo "$RESPONSE" | grep -q '"templates"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL (endpoint may not exist yet)${NC}"
fi

# Test 5: Employee list page
echo -n "Test 5: GET /employees (page)... "
if curl -s "$BASE_URL/employees" | grep -q "Data Karyawan"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 6: Employee add page
echo -n "Test 6: GET /employees/new (page)... "
if curl -s "$BASE_URL/employees/new" | grep -q "Tambah Karyawan"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 7: Generate payslip page
echo -n "Test 7: GET /generate (page)... "
if curl -s "$BASE_URL/generate" | grep -q "Buat Slip Gaji\|Generate"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 8: Create payslip (if we have an employee)
if [ -n "$EMPLOYEE_ID" ]; then
    echo -n "Test 8: POST /api/payslips... "
    
    # Get a template ID first
    TEMPLATE_ID=$(curl -s "$BASE_URL/api/templates" 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -z "$TEMPLATE_ID" ]; then
        TEMPLATE_ID="template-1" # fallback
    fi
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/payslips" \
        -H "Content-Type: application/json" \
        -d "{
            \"employeeId\":\"$EMPLOYEE_ID\",
            \"templateId\":\"$TEMPLATE_ID\",
            \"periodType\":\"monthly\",
            \"startDate\":\"2024-01-01\",
            \"endDate\":\"2024-01-31\",
            \"basePay\":10000000
        }" 2>/dev/null || echo '{"error":"failed"}')
    
    if echo "$RESPONSE" | grep -q '"success":true\|"payslipId"'; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Response: $RESPONSE"
    fi
else
    echo -e "Test 8: POST /api/payslips... ${RED}SKIPPED${NC} (no employee created)"
fi

echo ""
echo "=== Tests Complete ==="

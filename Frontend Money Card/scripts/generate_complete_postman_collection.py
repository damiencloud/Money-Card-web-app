import json
import os

def generate_postman_collection():
    root_dir = os.getcwd()
    contracts_dir = os.path.join(root_dir, 'api-contracts')

    def read_json_safe(rel_path):
        full_path = os.path.join(contracts_dir, rel_path)
        if os.path.exists(full_path):
            with open(full_path, 'r', encoding='utf-8') as f:
                return f.read().strip()
        return "{}"

    collection = {
        "info": {
            "_postman_id": "money-card-m0-v10-complete-suite",
            "name": "Money Card — Complete M0 V10 API Contract Suite (65 Routes)",
            "description": "Authoritative Postman Collection for Developer 2 containing all 65 M0 V10 endpoints with request payloads and authorization configs.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": [],
        "variable": [
            { "key": "baseUrl", "value": "http://localhost:4000/api/v1", "type": "string" },
            { "key": "accessToken", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_token", "type": "string" },
            { "key": "orgId", "value": "org_001", "type": "string" },
            { "key": "branchId", "value": "branch_001", "type": "string" },
            { "key": "cardId", "value": "CARD001", "type": "string" },
            { "key": "sessionId", "value": "SESSION001", "type": "string" },
            { "key": "staffId", "value": "staff_001", "type": "string" },
            { "key": "planId", "value": "PLAN_PRO", "type": "string" },
            { "key": "requestId", "value": "PCR001", "type": "string" },
            { "key": "subscriptionId", "value": "sub_001", "type": "string" },
            { "key": "reportId", "value": "rep_001", "type": "string" },
            { "key": "inventoryId", "value": "INV001", "type": "string" },
            { "key": "sessionToken", "value": "portal_token_mc001_session001", "type": "string" }
        ]
    }

    groups = [
        {
            "name": "1. Authentication (7 Routes)",
            "items": [
                {
                    "name": "1. POST /api/v1/auth/login",
                    "method": "POST",
                    "path": ["auth", "login"],
                    "auth": False,
                    "body": read_json_safe("auth/login.request.json")
                },
                {
                    "name": "2. POST /api/v1/auth/refresh",
                    "method": "POST",
                    "path": ["auth", "refresh"],
                    "auth": False,
                    "body": read_json_safe("auth/refresh.request.json")
                },
                {
                    "name": "3. POST /api/v1/auth/logout",
                    "method": "POST",
                    "path": ["auth", "logout"],
                    "auth": True,
                    "body": read_json_safe("auth/logout.request.json")
                },
                {
                    "name": "4. GET /api/v1/auth/me",
                    "method": "GET",
                    "path": ["auth", "me"],
                    "auth": True
                },
                {
                    "name": "5. POST /api/v1/auth/forgot-password",
                    "method": "POST",
                    "path": ["auth", "forgot-password"],
                    "auth": False,
                    "body": read_json_safe("auth/forgot-password.request.json")
                },
                {
                    "name": "6. POST /api/v1/auth/reset-password",
                    "method": "POST",
                    "path": ["auth", "reset-password"],
                    "auth": False,
                    "body": read_json_safe("auth/reset-password.request.json")
                },
                {
                    "name": "7. POST /api/v1/auth/change-password",
                    "method": "POST",
                    "path": ["auth", "change-password"],
                    "auth": True,
                    "body": read_json_safe("auth/change-password.request.json")
                }
            ]
        },
        {
            "name": "2. Super Admin — Organizations (4 Routes)",
            "items": [
                {
                    "name": "8. GET /api/v1/admin/organizations",
                    "method": "GET",
                    "path": ["admin", "organizations"],
                    "auth": True,
                    "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "20"}]
                },
                {
                    "name": "9. POST /api/v1/admin/organizations",
                    "method": "POST",
                    "path": ["admin", "organizations"],
                    "auth": True,
                    "body": read_json_safe("admin/create-organization.request.json")
                },
                {
                    "name": "10. GET /api/v1/admin/organizations/:id",
                    "method": "GET",
                    "path": ["admin", "organizations", "{{orgId}}"],
                    "auth": True
                },
                {
                    "name": "11. PATCH /api/v1/admin/organizations/:id",
                    "method": "PATCH",
                    "path": ["admin", "organizations", "{{orgId}}"],
                    "auth": True,
                    "body": read_json_safe("admin/update-organization.request.json")
                }
            ]
        },
        {
            "name": "3. Super Admin — Plan Catalog (4 Routes)",
            "items": [
                {
                    "name": "12. GET /api/v1/admin/plans",
                    "method": "GET",
                    "path": ["admin", "plans"],
                    "auth": True
                },
                {
                    "name": "13. POST /api/v1/admin/plans",
                    "method": "POST",
                    "path": ["admin", "plans"],
                    "auth": True,
                    "body": read_json_safe("admin/create-plan.request.json")
                },
                {
                    "name": "14. GET /api/v1/admin/plans/:id",
                    "method": "GET",
                    "path": ["admin", "plans", "{{planId}}"],
                    "auth": True
                },
                {
                    "name": "15. PATCH /api/v1/admin/plans/:id",
                    "method": "PATCH",
                    "path": ["admin", "plans", "{{planId}}"],
                    "auth": True,
                    "body": read_json_safe("admin/update-plan.request.json")
                }
            ]
        },
        {
            "name": "4. Super Admin — Subscriptions & Overrides (4 Routes)",
            "items": [
                {
                    "name": "16. GET /api/v1/admin/organizations/:id/subscription",
                    "method": "GET",
                    "path": ["admin", "organizations", "{{orgId}}", "subscription"],
                    "auth": True
                },
                {
                    "name": "17. PATCH /api/v1/admin/organizations/:id/subscription",
                    "method": "PATCH",
                    "path": ["admin", "organizations", "{{orgId}}", "subscription"],
                    "auth": True,
                    "body": read_json_safe("admin/update-org-subscription.request.json")
                },
                {
                    "name": "18. GET /api/v1/admin/organizations/:id/limit-overrides",
                    "method": "GET",
                    "path": ["admin", "organizations", "{{orgId}}", "limit-overrides"],
                    "auth": True
                },
                {
                    "name": "19. PATCH /api/v1/admin/organizations/:id/limit-overrides",
                    "method": "PATCH",
                    "path": ["admin", "organizations", "{{orgId}}", "limit-overrides"],
                    "auth": True,
                    "body": read_json_safe("admin/update-org-limit-overrides.request.json")
                }
            ]
        },
        {
            "name": "5. Super Admin — Direct Billing & Subscriptions (3 Routes)",
            "items": [
                {
                    "name": "20. GET /api/v1/admin/subscriptions",
                    "method": "GET",
                    "path": ["admin", "subscriptions"],
                    "auth": True,
                    "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "20"}]
                },
                {
                    "name": "21. GET /api/v1/admin/subscriptions/:id",
                    "method": "GET",
                    "path": ["admin", "subscriptions", "{{subscriptionId}}"],
                    "auth": True
                },
                {
                    "name": "22. GET /api/v1/admin/subscription-payments",
                    "method": "GET",
                    "path": ["admin", "subscription-payments"],
                    "auth": True,
                    "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "20"}]
                }
            ]
        },
        {
            "name": "6. Super Admin — Plan Change Requests Review (3 Routes)",
            "items": [
                {
                    "name": "23. GET /api/v1/admin/plan-change-requests",
                    "method": "GET",
                    "path": ["admin", "plan-change-requests"],
                    "auth": True,
                    "query": [{"key": "status", "value": "PENDING"}]
                },
                {
                    "name": "24. GET /api/v1/admin/plan-change-requests/:id",
                    "method": "GET",
                    "path": ["admin", "plan-change-requests", "{{requestId}}"],
                    "auth": True
                },
                {
                    "name": "25. PATCH /api/v1/admin/plan-change-requests/:id",
                    "method": "PATCH",
                    "path": ["admin", "plan-change-requests", "{{requestId}}"],
                    "auth": True,
                    "body": read_json_safe("admin/review-plan-change-request.request.json")
                }
            ]
        },
        {
            "name": "7. Organization Admin Profile (2 Routes)",
            "items": [
                {
                    "name": "26. GET /api/v1/organization",
                    "method": "GET",
                    "path": ["organization"],
                    "auth": True
                },
                {
                    "name": "27. PATCH /api/v1/organization",
                    "method": "PATCH",
                    "path": ["organization"],
                    "auth": True,
                    "body": read_json_safe("organizations/update-profile.request.json")
                }
            ]
        },
        {
            "name": "8. Branches Management (4 Routes)",
            "items": [
                {
                    "name": "28. GET /api/v1/branches",
                    "method": "GET",
                    "path": ["branches"],
                    "auth": True,
                    "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "20"}]
                },
                {
                    "name": "29. POST /api/v1/branches",
                    "method": "POST",
                    "path": ["branches"],
                    "auth": True,
                    "body": read_json_safe("branches/create-branch.request.json")
                },
                {
                    "name": "30. GET /api/v1/branches/:id",
                    "method": "GET",
                    "path": ["branches", "{{branchId}}"],
                    "auth": True
                },
                {
                    "name": "31. PATCH /api/v1/branches/:id",
                    "method": "PATCH",
                    "path": ["branches", "{{branchId}}"],
                    "auth": True,
                    "body": read_json_safe("branches/update-branch.request.json")
                }
            ]
        },
        {
            "name": "9. Staff & Access Control (4 Routes)",
            "items": [
                {
                    "name": "32. GET /api/v1/staff",
                    "method": "GET",
                    "path": ["staff"],
                    "auth": True,
                    "query": [{"key": "page", "value": "1"}, {"key": "limit", "value": "20"}]
                },
                {
                    "name": "33. POST /api/v1/staff",
                    "method": "POST",
                    "path": ["staff"],
                    "auth": True,
                    "body": read_json_safe("staff/create-staff.request.json")
                },
                {
                    "name": "34. PUT /api/v1/staff/:id/branches",
                    "method": "PUT",
                    "path": ["staff", "{{staffId}}", "branches"],
                    "auth": True,
                    "body": read_json_safe("staff/replace-staff-branches.request.json")
                },
                {
                    "name": "35. PUT /api/v1/staff/:id/permissions",
                    "method": "PUT",
                    "path": ["staff", "{{staffId}}", "permissions"],
                    "auth": True,
                    "body": read_json_safe("staff/replace-staff-permissions.request.json")
                }
            ]
        },
        {
            "name": "10. Permissions Catalog (1 Route)",
            "items": [
                {
                    "name": "36. GET /api/v1/permissions",
                    "method": "GET",
                    "path": ["permissions"],
                    "auth": True
                }
            ]
        },
        {
            "name": "11. Cards Management (5 Routes)",
            "items": [
                {
                    "name": "37. GET /api/v1/cards",
                    "method": "GET",
                    "path": ["cards"],
                    "auth": True,
                    "query": [{"key": "status", "value": "ALL"}, {"key": "page", "value": "1"}]
                },
                {
                    "name": "38. POST /api/v1/cards",
                    "method": "POST",
                    "path": ["cards"],
                    "auth": True,
                    "body": read_json_safe("cards/create-card.request.json")
                },
                {
                    "name": "39. POST /api/v1/cards/resolve",
                    "method": "POST",
                    "path": ["cards", "resolve"],
                    "auth": True,
                    "body": read_json_safe("cards/resolve-card.request.json")
                },
                {
                    "name": "40. POST /api/v1/cards/:id/block",
                    "method": "POST",
                    "path": ["cards", "{{cardId}}", "block"],
                    "auth": True,
                    "body": read_json_safe("cards/block-card.request.json")
                },
                {
                    "name": "41. POST /api/v1/cards/:id/unblock",
                    "method": "POST",
                    "path": ["cards", "{{cardId}}", "unblock"],
                    "auth": True,
                    "body": read_json_safe("cards/unblock-card.request.json")
                }
            ]
        },
        {
            "name": "12. Card Sessions & POS Financials (4 Routes)",
            "items": [
                {
                    "name": "42. POST /api/v1/card-sessions",
                    "method": "POST",
                    "path": ["card-sessions"],
                    "auth": True,
                    "body": read_json_safe("card-sessions/create-session.request.json")
                },
                {
                    "name": "43. POST /api/v1/card-sessions/:id/recharge",
                    "method": "POST",
                    "path": ["card-sessions", "{{sessionId}}", "recharge"],
                    "auth": True,
                    "body": read_json_safe("card-sessions/recharge-session.request.json")
                },
                {
                    "name": "44. POST /api/v1/card-sessions/:id/purchase",
                    "method": "POST",
                    "path": ["card-sessions", "{{sessionId}}", "purchase"],
                    "auth": True,
                    "body": read_json_safe("card-sessions/purchase.request.json")
                },
                {
                    "name": "45. POST /api/v1/card-sessions/:id/return",
                    "method": "POST",
                    "path": ["card-sessions", "{{sessionId}}", "return"],
                    "auth": True,
                    "body": read_json_safe("card-sessions/return-session.request.json")
                }
            ]
        },
        {
            "name": "13. Products Catalog (2 Routes)",
            "items": [
                {
                    "name": "46. GET /api/v1/products",
                    "method": "GET",
                    "path": ["products"],
                    "auth": True,
                    "query": [{"key": "branchId", "value": "{{branchId}}"}]
                },
                {
                    "name": "47. POST /api/v1/products",
                    "method": "POST",
                    "path": ["products"],
                    "auth": True,
                    "body": read_json_safe("products/create-product.request.json")
                }
            ]
        },
        {
            "name": "14. Inventory & CSV Import (5 Routes)",
            "items": [
                {
                    "name": "48. GET /api/v1/inventory",
                    "method": "GET",
                    "path": ["inventory"],
                    "auth": True,
                    "query": [{"key": "branchId", "value": "{{branchId}}"}]
                },
                {
                    "name": "49. PATCH /api/v1/inventory/:id",
                    "method": "PATCH",
                    "path": ["inventory", "{{inventoryId}}"],
                    "auth": True,
                    "body": read_json_safe("inventory/update-inventory.request.json")
                },
                {
                    "name": "50. GET /api/v1/inventory/import/template",
                    "method": "GET",
                    "path": ["inventory", "import", "template"],
                    "auth": True
                },
                {
                    "name": "51. POST /api/v1/inventory/import (Preview)",
                    "method": "POST",
                    "path": ["inventory", "import"],
                    "auth": True,
                    "body": "{\n  \"branchId\": \"branch_001\",\n  \"csvContent\": \"itemName,category,price\\nVeg Burger,Veg|Fast Food,120\\nMasala Chai,Beverage|Hot,30\"\n}"
                },
                {
                    "name": "52. POST /api/v1/inventory/import (Commit)",
                    "method": "POST",
                    "path": ["inventory", "import"],
                    "auth": True,
                    "body": read_json_safe("inventory/import-confirm.request.json")
                }
            ]
        },
        {
            "name": "15. Analytics & PDF Reports (4 Routes)",
            "items": [
                {
                    "name": "53. GET /api/v1/analytics",
                    "method": "GET",
                    "path": ["analytics"],
                    "auth": True,
                    "query": [{"key": "branchId", "value": "ALL"}]
                },
                {
                    "name": "54. GET /api/v1/analytics/export",
                    "method": "GET",
                    "path": ["analytics", "export"],
                    "auth": True,
                    "query": [{"key": "format", "value": "pdf"}, {"key": "branchId", "value": "ALL"}]
                },
                {
                    "name": "55. GET /api/v1/reports",
                    "method": "GET",
                    "path": ["reports"],
                    "auth": True
                },
                {
                    "name": "56. GET /api/v1/reports/:id/pdf",
                    "method": "GET",
                    "path": ["reports", "{{reportId}}", "pdf"],
                    "auth": True
                }
            ]
        },
        {
            "name": "16. Org Admin Subscriptions & Plan Requests (4 Routes)",
            "items": [
                {
                    "name": "57. GET /api/v1/subscription/plans",
                    "method": "GET",
                    "path": ["subscription", "plans"],
                    "auth": True
                },
                {
                    "name": "58. GET /api/v1/subscription",
                    "method": "GET",
                    "path": ["subscription"],
                    "auth": True
                },
                {
                    "name": "59. GET /api/v1/subscription/payments",
                    "method": "GET",
                    "path": ["subscription", "payments"],
                    "auth": True
                },
                {
                    "name": "60. POST /api/v1/subscription/plan-requests",
                    "method": "POST",
                    "path": ["subscription", "plan-requests"],
                    "auth": True,
                    "body": read_json_safe("plan-change-requests/create-request.request.json")
                }
            ]
        },
        {
            "name": "17. Public User Portal (5 Routes)",
            "items": [
                {
                    "name": "61. POST /api/v1/public/cards/resolve",
                    "method": "POST",
                    "path": ["public", "cards", "resolve"],
                    "auth": False,
                    "body": read_json_safe("public-user-portal/resolve-card.request.json")
                },
                {
                    "name": "62. POST /api/v1/public/sessions/access",
                    "method": "POST",
                    "path": ["public", "sessions", "access"],
                    "auth": False,
                    "body": read_json_safe("public-user-portal/access-session.request.json")
                },
                {
                    "name": "63. GET /api/v1/public/sessions/:sessionToken",
                    "method": "GET",
                    "path": ["public", "sessions", "{{sessionToken}}"],
                    "auth": False
                },
                {
                    "name": "64. GET /api/v1/public/sessions/:sessionToken/transactions",
                    "method": "GET",
                    "path": ["public", "sessions", "{{sessionToken}}", "transactions"],
                    "auth": False
                },
                {
                    "name": "65. GET /api/v1/public/sessions/:sessionToken/receipts",
                    "method": "GET",
                    "path": ["public", "sessions", "{{sessionToken}}", "receipts"],
                    "auth": False
                }
            ]
        }
    ]

    total_count = 0
    for group in groups:
        folder = {
            "name": group["name"],
            "item": []
        }
        for it in group["items"]:
            total_count += 1
            headers = []
            if it.get("body"):
                headers.append({ "key": "Content-Type", "value": "application/json" })
            if it.get("auth"):
                headers.append({ "key": "Authorization", "value": "Bearer {{accessToken}}" })
            
            raw_url = "{{baseUrl}}/" + "/".join(it["path"])
            if it.get("query"):
                q_strs = [f"{q['key']}={q['value']}" for q in it["query"]]
                raw_url += "?" + "&".join(q_strs)

            req_obj = {
                "name": it["name"],
                "request": {
                    "method": it["method"],
                    "header": headers,
                    "url": {
                        "raw": raw_url,
                        "host": ["{{baseUrl}}"],
                        "path": it["path"]
                    }
                }
            }
            if it.get("query"):
                req_obj["request"]["url"]["query"] = it["query"]
            if it.get("body"):
                req_obj["request"]["body"] = {
                    "mode": "raw",
                    "raw": it["body"]
                }
            folder["item"].append(req_obj)
        collection["item"].append(folder)

    # Save to root and to handoff pack
    postman_path = os.path.join(root_dir, "POSTMAN_COLLECTION.json")
    with open(postman_path, "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=2)

    handoff_postman_path = os.path.join(root_dir, "developer-2-handoff-pack", "POSTMAN_COLLECTION.json")
    with open(handoff_postman_path, "w", encoding="utf-8") as f:
        json.dump(collection, f, indent=2)

    print(f"Generated 100% complete Postman Collection with EXACTLY {total_count} requests!")

if __name__ == '__main__':
    generate_postman_collection()

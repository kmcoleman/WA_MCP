# Wild Apricot MCP Server

An MCP (Model Context Protocol) server that provides access to the Wild Apricot API. Use this to integrate Wild Apricot data with Claude and other MCP-compatible AI assistants.

---

## ⚠️ Important Warnings

> **USE AT YOUR OWN RISK**
>
> This software is provided as-is. **Not all functionality has been thoroughly tested**, especially the **write/update/delete operations**.
>
> **Before using write operations:**
> - Consider running in **read-only mode** first to explore your data safely
> - Test with non-critical data or a sandbox Wild Apricot account if possible
> - Be very careful with your prompts - AI assistants may misinterpret requests
> - Review the preview data before confirming any write operation
> - Delete operations require **double confirmation** with exact text matching
>
> **The author is not responsible for any data loss, corruption, or unintended modifications to your Wild Apricot account.**

---

## Features

- **Read Operations**: Query contacts, events, registrations, membership levels, invoices, and account info
- **Write Operations**: Create and update contacts, events, registrations, and invoices (can be disabled)
- **Delete Operations**: Delete contacts and events with double confirmation (extra safety)
- **Confirmation Required**: All write operations require explicit confirmation before execution
- **Input Validation**: Email, date, and field validation before staging operations
- **CSV Export**: Export contacts, events, and registrations to CSV format
- **Quick Actions**: Simplified tools for common tasks (search by name, check-in by email, etc.)
- **Read-Only Mode**: Disable all mutations for safe data exploration
- **Rate Limiting**: Built-in delays to respect Wild Apricot API limits

---

## Table of Contents

- [Setup](#setup)
- [Available Tools](#available-tools)
- [Confirmation Workflows](#confirmation-workflows)
- [Example Prompts](#example-prompts)
- [Configuration Options](#configuration-options)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Setup

### 1. Get Your API Credentials

1. Log into your Wild Apricot admin panel
2. Go to **Settings** > **Security** > **Authorized applications**
3. Click **Authorize application**
4. Select **Server application** (API key)
5. Choose the appropriate access level:
   - **Read-only access** - Recommended for initial testing
   - **Full access** - Required for write operations
6. Copy the **API key** that is generated
7. Note your **Account ID** (visible in the URL: `https://app.wildapricot.org/admin/XXXXXX/...`)

### 2. Install

```bash
git clone https://github.com/yourusername/wildapricot-mcp.git
cd wildapricot-mcp
npm install
npm run build
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Add to Claude Desktop

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "wildapricot": {
      "command": "node",
      "args": ["/full/path/to/wildapricot-mcp/dist/index.js"],
      "env": {
        "WILDAPRICOT_API_KEY": "your_api_key_here",
        "WILDAPRICOT_ACCOUNT_ID": "your_account_id_here",
        "WILDAPRICOT_READ_ONLY": "true"
      }
    }
  }
}
```

---

## Available Tools

### Read Operations (18 tools - Always Available)

#### Account & Contacts
| Tool | Description |
|------|-------------|
| `get_account` | Get account details (name, timezone, currency, contact count) |
| `list_contacts` | List/search contacts with OData filters |
| `get_contact` | Get contact by ID |
| `get_contact_by_email` | Find contact by exact email address |
| `search_contacts_by_name` | Search by first/last name (simpler than filters) |
| `export_contacts_csv` | Export contacts to CSV format |

#### Events
| Tool | Description |
|------|-------------|
| `list_events` | List events with date filters |
| `get_event` | Get event by ID |
| `get_upcoming_events` | Get events in next N days (default: 30) |
| `get_event_attendees` | Get event + all registrations in one call |
| `export_events_csv` | Export events to CSV format |

#### Registrations
| Tool | Description |
|------|-------------|
| `list_event_registrations` | List registrations for an event |
| `get_registration` | Get registration by ID |
| `find_registration_by_email` | Find registration by attendee email |
| `export_registrations_csv` | Export registrations to CSV format |

#### Other
| Tool | Description |
|------|-------------|
| `list_membership_levels` | List all membership levels |
| `list_invoices` | List invoices with filters |
| `get_invoice` | Get invoice by ID |

### Write Operations (9 tools - Disabled when READ_ONLY=true)

> ⚠️ All write operations require confirmation. Delete operations require **double confirmation**.

| Tool | Description | Confirmation |
|------|-------------|--------------|
| `create_contact` | Create a new contact | `confirm_operation` |
| `update_contact` | Update contact fields | `confirm_operation` |
| `delete_contact` | Delete a contact permanently | `confirm_delete` + "DELETE" |
| `create_event` | Create a new event | `confirm_operation` |
| `update_event` | Update event details | `confirm_operation` |
| `delete_event` | Delete event and all registrations | `confirm_delete` + "DELETE" |
| `update_registration` | Update registration (check-in, memo) | `confirm_operation` |
| `check_in_by_email` | Find and check in by email | `confirm_operation` |
| `create_invoice` | Create a new invoice | `confirm_operation` |

### Confirmation Tools (4 tools - Disabled when READ_ONLY=true)

| Tool | Description |
|------|-------------|
| `confirm_operation` | Execute a pending create/update operation |
| `confirm_delete` | Execute a pending delete operation (requires "DELETE" text) |
| `cancel_operation` | Cancel a pending operation |
| `list_pending_operations` | List all pending operations |

---

## Confirmation Workflows

### Standard Write Operations (Create/Update)

```
1. Call write tool (e.g., create_contact)
   → Returns: operationId + preview

2. Review the preview

3. Call confirm_operation(operationId)
   → Executes the operation
```

### Delete Operations (Double Confirmation)

Delete operations have extra safety:

```
1. Call delete tool with matching IDs
   delete_contact(contactId: 123, confirmContactId: 123)
   → Returns: operationId + preview

2. Review what will be deleted

3. Call confirm_delete(operationId, confirmText: "DELETE")
   → Must type "DELETE" exactly to proceed
```

### Example: Delete a Contact

```
User: "Delete contact 12345"

AI calls: delete_contact(contactId: 12345, confirmContactId: 12345)

Response:
{
  "status": "PENDING_DOUBLE_CONFIRMATION",
  "operationId": "op_xxx",
  "warning": "THIS CANNOT BE UNDONE",
  "preview": {
    "action": "DELETE CONTACT",
    "contactId": 12345,
    "contactName": "John Smith",
    "contactEmail": "john@example.com"
  }
}

User: "Yes, delete it"

AI calls: confirm_delete(operationId: "op_xxx", confirmText: "DELETE")

Response:
{
  "success": true,
  "message": "⚠️ DELETED: DELETE contact: John Smith..."
}
```

---

## Example Prompts

### Safe Read-Only Prompts

```
"Show me account information"
"List all active members"
"Find John Smith"
"Get contact with email john@example.com"
"Show upcoming events for the next 2 weeks"
"Get all registrations for event 12345"
"Export all contacts to CSV"
"Export registrations for event 12345 to CSV"
```

### Write Prompts (Require Confirmation)

```
"Create a contact for Jane Doe with email jane@example.com"
→ Review preview → "Confirm"

"Check in john@example.com for event 12345"
→ Review preview → "Yes, check them in"

"Update event 12345 location to 'Main Hall'"
→ Review preview → "Confirm the update"
```

### Delete Prompts (Require Double Confirmation)

```
"Delete contact 12345"
→ Review what will be deleted
→ "Yes, permanently delete it"
→ AI must call confirm_delete with "DELETE"
```

### Prompts to Avoid

```
❌ "Update all contacts..." - Could stage many operations
❌ "Delete all old events..." - Very dangerous
❌ "Confirm all pending operations" - Review each one!
❌ "Clean up the database..." - Ambiguous and dangerous
```

---

## Configuration Options

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `WILDAPRICOT_API_KEY` | Yes | - | Your Wild Apricot API key |
| `WILDAPRICOT_ACCOUNT_ID` | Yes | - | Your Wild Apricot account ID |
| `WILDAPRICOT_READ_ONLY` | No | `false` | Set to `true` to disable all write operations |

---

## Development

```bash
npm run dev    # Development mode with tsx
npm run build  # Build for production
npm start      # Start production server
```

### Project Structure

```
src/
├── index.ts              # MCP server entry point
├── config.ts             # Configuration loading
├── auth.ts               # OAuth token management
├── client.ts             # API client with rate limiting
├── validation.ts         # Input validation utilities
├── csv-export.ts         # CSV export utilities
├── pending-operations.ts # Confirmation system
└── tools/
    ├── index.ts          # Tool registration
    ├── account.ts        # Account tools
    ├── contacts.ts       # Contact tools (CRUD + search + export)
    ├── events.ts         # Event tools (CRUD + search + export)
    ├── registrations.ts  # Registration tools (RU + search + export)
    ├── memberships.ts    # Membership level tools
    └── invoices.ts       # Invoice tools (CR)
```

---

## Troubleshooting

### Common Errors

| Error | Solution |
|-------|----------|
| "WILDAPRICOT_API_KEY required" | Set environment variable in config |
| "Authentication failed: 401" | Regenerate API key in WA admin |
| "API error: 403" | Check API key permissions |
| "API error: 429" | Rate limited - wait and retry |
| "Operation not found" | Expired (5 min limit) - stage again |
| "Validation error" | Check input format (email, dates, IDs) |

### Delete Confirmation Fails

- Ensure `confirmText` is exactly `"DELETE"` (all caps)
- Make sure `contactId`/`eventId` matches the confirm parameter
- Check operation hasn't expired (5 minute limit)

---

## API Reference

- [Wild Apricot API v2.2 Documentation](https://app.swaggerhub.com/apis-docs/WildApricot/wild-apricot_public_api/2.2.0)
- [Wild Apricot Developer Portal](https://gethelp.wildapricot.com/en/articles/182)

---

## License

MIT

---

## Disclaimer

This project is not affiliated with Wild Apricot or Personify. Wild Apricot is a trademark of Personify.

This software is provided "as is", without warranty of any kind. **Use at your own risk.**

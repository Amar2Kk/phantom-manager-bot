# Shop Order Management Guide

Complete guide for managing shop orders and tracking user credits.

## Overview

The bot includes a complete order management system for tracking shop orders, managing order statuses, and automatically calculating user credits based on completed orders.

## Order Workflow

```
1. Create Order → 2. Payment Received → 3. Done → Credits Added ✅
                                      ↓
                                  Canceled → Credits Deducted ⚠️
```

## Order Statuses

| Status | Emoji | Description | Credits Impact |
|--------|-------|-------------|----------------|
| **Pending** | ⏳ | Payment not received yet | No change |
| **Payment Received** | 💵 | Payment received, work in progress | No change |
| **Done** | ✅ | Order completed successfully | **+Credits** added to assigned user |
| **Canceled** | ❌ | Order canceled | **-Credits** deducted if previously marked as Done |

## Commands

### `/order`
Create a new shop order with interactive status buttons.

**Usage:**
1. Run `/order @user` (select the user to assign the order to)
2. Fill in the form:
   - **Order ID**: Unique identifier (e.g., ORD-12345)
   - **Game**: Game name (e.g., Valorant, League of Legends)
   - **Price**: Order price in dollars (e.g., 25.50)
   - **Notes**: Optional additional details
3. Order is created with 3 interactive buttons:
   - **💵 Payment Received** - Mark when payment is received
   - **✅ Mark as Done** - Complete the order (adds credits)
   - **❌ Cancel Order** - Cancel the order (deducts credits if was done)

**Example:**
```
/order user:@John
```
Then fill the modal:
- Order ID: ORD-001
- Game: Valorant
- Price: 50.00
- Notes: Radiant boost

**Result:** An embed message with 3 buttons appears. Click buttons to update status!

### `/order-status`
View an order's current status and details.

**Usage:**
```
/order-status order-id:ORD-001
```

Shows complete order information without updating status.

### `/orders`
List orders with optional filters.

**Examples:**
```
# List all orders
/orders

# List only pending orders
/orders status:Pending

# List orders for a specific user
/orders user:@John

# List completed orders (limit 5)
/orders status:Done limit:5
```

### `/credits`
Check user credits and order statistics.

**Examples:**
```
# Check your own credits
/credits

# Check another user's credits
/credits user:@John
```

**Shows:**
- Total credits earned
- Total orders
- Completed orders
- Pending orders
- Payment received orders
- Canceled orders
- Completion rate

### `/credits-leaderboard`
View the credits leaderboard.

**Examples:**
```
# Top 10 earners
/credits-leaderboard

# Top 20 earners
/credits-leaderboard limit:20
```

### `/total`
Quick view of your total credits (ephemeral - only you can see).

**Example:**
```
/total
```

Shows your current credit balance in a simple format.

### `/reset-credits` (Admin Only)
Reset a specific user's credits to $0.00.

**Example:**
```
/reset-credits user:@John
```

**Requirements:**
- Administrator permissions required
- Shows previous amount before reset
- Logs who performed the reset

### `/reset-all-credits` (Admin Only)
Reset ALL users' credits to $0.00.

**⚠️ WARNING: This action cannot be undone!**

**Example:**
```
/reset-all-credits
```

**Safety Features:**
- Requires confirmation button
- Shows number of users affected
- Shows total amount being reset
- 30-second timeout for confirmation
- Administrator permissions required

**Use Cases:**
- Starting a new season
- Resetting after testing
- Monthly/weekly credit resets

## How Credits Work

### Adding Credits
When an order is marked as **Done**:
- The order price is **added** to the assigned user's credits
- Example: Order price $50 → User credits +$50

### Deducting Credits
When a **Done** order is marked as **Canceled**:
- The order price is **deducted** from the assigned user's credits
- Example: Order price $50 → User credits -$50

### Status Changes
- **Pending → Done**: Credits added
- **Payment Received → Done**: Credits added
- **Done → Canceled**: Credits deducted
- **Done → Pending**: Credits deducted
- **Done → Payment Received**: Credits deducted

## Best Practices

### Order IDs
- Use a consistent format (e.g., ORD-001, ORD-002)
- Make them unique per server
- Include date or sequence numbers

### Order Flow
1. **Create order** with `/order` - Creates embed with buttons
2. **Click "💵 Payment Received"** when customer pays
3. **Click "✅ Mark as Done"** when order is completed (adds credits)
4. **Click "❌ Cancel Order"** only if necessary (deducts credits if was done)

### Managing Credits
- Check credits regularly with `/credits`
- Use `/credits-leaderboard` to track top earners
- Review order history with `/orders user:@User`

## Examples

### Complete Order Flow

**1. Create Order**
```
/order user:@Sarah
```
Fill form:
- Order ID: ORD-101
- Game: Apex Legends
- Price: 75.00
- Notes: Predator rank boost

**2. Update to Payment Received**
Click the **💵 Payment Received** button on the order message

**3. Complete Order**
Click the **✅ Mark as Done** button
✅ Sarah's credits: +$75.00

**4. Check Sarah's Stats**
```
/credits user:@Sarah
```

### Handling Cancellations

**If order was completed but needs to be canceled:**
Click the **❌ Cancel Order** button on the order message
⚠️ Sarah's credits: -$75.00 (deducted)

**Note:** 
- **All buttons remain active** at all times (except the current status button)
- Orders can transition between any states:
  - Done → Canceled (deducts credits)
  - Canceled → Done (adds credits back)
  - Done → Payment Received → Done (no credit change)
- Credits are calculated based on status changes:
  - Changing TO Done: Adds credits
  - Changing FROM Done to anything else: Deducts credits

## Database Schema

### Orders Table
- Order ID (unique per guild)
- Guild ID
- Game name
- Price
- Assigned user ID
- Created by user ID
- Status
- Notes
- Timestamps

### User Credits Table
- User ID
- Guild ID
- Total credits
- Timestamps

## Tips

1. **Use descriptive Order IDs** - Makes tracking easier
2. **Add notes** - Include important details about the order
3. **Update status promptly** - Keep credits accurate
4. **Check credits before canceling** - Understand the impact
5. **Use filters** - Find orders quickly with `/orders` filters

## Troubleshooting

### Order ID already exists
Each order ID must be unique in the server. Use a different ID.

### Credits not updating
Make sure you're changing the status to/from **Done**. Only Done status affects credits.

### Can't find order
- Check the order ID spelling
- Make sure you're in the correct server
- Use `/orders` to list all orders

### Negative credits
This can happen if orders are canceled after completion. This is intentional to track deductions.

## Support

For issues or questions:
1. Check order status with `/order-status`
2. Review order list with `/orders`
3. Verify credits with `/credits`


# Action Logging System Guide

Complete guide for the bot's action logging system.

## Overview

The bot includes a comprehensive logging system that tracks all important actions in a designated channel. All logs are sent as rich embeds with color-coded information.

## Setup

### 1. Set Log Channel

Use `/set-log-channel` to configure where logs should be sent:

```
/set-log-channel channel:#logs
```

**Requirements:**
- Administrator permissions required
- Channel must be a text channel
- Bot needs permission to send messages in that channel

### 2. Remove Log Channel

Use `/remove-log-channel` to stop logging:

```
/remove-log-channel
```

This will disable all automatic logging. No logs will be deleted, but no new logs will be sent.

## What Gets Logged

### 📦 Order Creation

**Triggered when:** New order is created with `/order`

**Information logged:**
- Order ID
- Game name
- Price
- Assigned user
- Created by user
- Timestamp

**Embed color:** Green (0x00FF00)

---

### 🔄 Order Status Updates

**Triggered when:** Order status changes (Done, Canceled, Pending)

**Information logged:**
- Order ID
- Status change (old → new)
- Updated by user
- Credit change (if applicable)
  - Amount added/deducted
  - User affected
- Timestamp

**Embed color:** Blue (0x0099FF)

**Examples:**
- Pending → Done: Shows +credits
- Done → Canceled: Shows -credits
- Canceled → Done: Shows +credits

---

### 💵 Payment Status Changes

**Triggered when:** Payment received button is clicked

**Information logged:**
- Order ID
- Payment status (Received/Pending)
- Updated by user
- Timestamp

**Embed color:** 
- Blue (0x00BFFF) when received
- Orange (0xFFA500) when marked pending

**Note:** Payment status does NOT affect credits.

---

### 🔄 Single User Credit Reset

**Triggered when:** `/reset-credits` is used

**Information logged:**
- User who was reset
- Previous credit amount
- New amount ($0.00)
- Admin who performed reset
- Timestamp

**Embed color:** Orange (0xFF9900)

---

### ⚠️ All Credits Reset

**Triggered when:** `/reset-all-credits` is confirmed

**Information logged:**
- Number of users affected
- Total amount reset
- Admin who performed reset
- Timestamp

**Embed color:** Red (0xFF0000)

## Examples

### Order Creation Log

```
📦 Order Created

📋 Order ID: ORD-101
🎮 Game: Valorant
💰 Price: $50.00
👤 Assigned To: @John
👨‍💼 Created By: @Admin
```

### Order Status Update with Credits

```
🔄 Order Status Updated

📋 Order ID: ORD-101
📊 Status Change: Pending → Done
👤 Updated By: @Admin

💳 Credit Change
+$50.00 for @John
```

### Payment Status Log

```
💵 Payment Status Updated

📋 Order ID: ORD-101
💵 Status: ✅ Received
👤 Updated By: @Admin
```

### Credit Reset Log

```
🔄 Credits Reset

👤 User: @John
💰 Previous Amount: $250.00
💰 New Amount: $0.00
👨‍💼 Reset By: @Admin
```

### All Credits Reset Log

```
⚠️ All Credits Reset

All user credits have been reset to $0.00

👥 Users Affected: 15
💰 Total Amount Reset: $3,450.00
👨‍💼 Reset By: @Admin
```

## Best Practices

### Log Channel Setup

1. **Create a dedicated channel** (e.g., #bot-logs, #audit-log)
2. **Restrict permissions** so only admins can view
3. **Set bot permissions** to send messages and embeds
4. **Keep it organized** - one channel for all bot logs

### Managing Logs

- **Regular review:** Check logs weekly for patterns
- **Archive old logs:** Use Discord's archive feature
- **Monitor for issues:** Look for unusual activity
- **Document important changes:** Note major resets or updates

### Security

- **Protect log channel:** Only trusted users should see it
- **Track admin actions:** All credit resets are logged
- **Review permissions:** Ensure bot can't be abused
- **Monitor patterns:** Look for suspicious order patterns

## Troubleshooting

### Logs Not Appearing

1. **Check if log channel is set:**
   - Run `/set-log-channel` again
   - Verify the channel ID in database

2. **Check bot permissions:**
   - View Channel
   - Send Messages
   - Embed Links

3. **Check channel type:**
   - Must be a text channel
   - Not a voice/announcement channel

### Missing Information in Logs

- **All log fields are required** - if something's missing, it's a bug
- **Timestamps are automatic** - based on Discord's time
- **User mentions should work** - if they don't, user may have left

### Log Channel Deleted

If the configured log channel is deleted:
- Logs will fail silently (no errors)
- Run `/set-log-channel` again with new channel
- Or run `/remove-log-channel` to disable logging

## Technical Details

### Log Service

All logs are handled by `LogService` in `src/services/log-service.ts`:

```typescript
LogService.logOrderCreated(client, guildId, orderId, game, price, assignedUserId, createdBy)
LogService.logOrderStatusUpdate(client, guildId, orderId, oldStatus, newStatus, updatedBy, creditChange?)
LogService.logPaymentToggle(client, guildId, orderId, paymentReceived, updatedBy)
LogService.logCreditReset(client, guildId, userId, previousAmount, resetBy)
LogService.logAllCreditsReset(client, guildId, userCount, totalAmount, resetBy)
```

### Database Schema

Log channel configuration is stored in the `Guild` table:

```prisma
model Guild {
  id           String  @id
  name         String
  logChannelId String? // Channel for bot action logs
  // ... other fields
}
```

### Error Handling

- Logging errors are **silent** - they won't interrupt bot operations
- Failed logs are logged to console for debugging
- If channel is invalid, logs are skipped automatically

## FAQ

**Q: Can I have multiple log channels?**  
A: No, only one log channel per server. All actions are logged there.

**Q: Can I filter what gets logged?**  
A: Currently no. All actions are logged when a log channel is set. You can request this feature!

**Q: Are logs stored in the database?**  
A: No, logs are only sent to Discord. Discord stores the message history.

**Q: Can I export logs?**  
A: Use Discord's export tools or bots like DiscordChatExporter.

**Q: Do logs show user IDs or usernames?**  
A: Logs use Discord mentions (@user) which show current usernames.

**Q: What happens if the bot restarts?**  
A: Log channel configuration persists in the database. Logging continues normally.

## Summary

The action logging system provides:
- ✅ Complete audit trail of all bot actions
- ✅ Easy setup with slash commands
- ✅ Color-coded, rich embeds
- ✅ Credit change tracking
- ✅ Admin action monitoring
- ✅ Silent error handling (won't break bot operations)

For more information, see:
- [SHOP-GUIDE.md](./SHOP-GUIDE.md) - Shop order management
- [LEADERBOARD-GUIDE.md](./LEADERBOARD-GUIDE.md) - Live leaderboard
- [README.md](./README.md) - General setup and usage


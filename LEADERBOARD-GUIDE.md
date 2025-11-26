# Live Credits Leaderboard Guide

The bot can display a **live, auto-updating credits leaderboard** in any channel you choose!

## 🎯 Features

- **Real-time updates** - Updates automatically when credits change
- **Top 15 users** - Shows the top earners
- **Medal rankings** - 🥇🥈🥉 for top 3
- **Always current** - No manual updates needed
- **Single message** - One clean embed that updates in place

## 🚀 Setup

### 1. Set the Leaderboard Channel

```
/set-leaderboard channel:#leaderboard
```

This will:
- Create the leaderboard message in that channel
- Start tracking credit changes
- Update automatically

### 2. That's it!

The leaderboard is now live and will update whenever:
- An order is marked as Done (credits added)
- An order is canceled after being Done (credits deducted)
- Credits are manually reset
- Any credit change occurs

## 📊 What It Shows

```
┌──────┬─────────────────────┬──────────────┐
│ Rank │ User                │ Credits      │
├──────┼─────────────────────┼──────────────┤
│ 🥇   │ John                │      $250.00 │
│ 🥈   │ Sarah               │      $180.50 │
│ 🥉   │ Mike                │      $150.00 │
│ #4   │ Alice               │      $120.00 │
│ #5   │ Bob                 │       $95.50 │
│ #6   │ Charlie             │       $75.00 │
│ ...                                       │
└──────┴─────────────────────┴──────────────┘

Updates automatically when credits change
```

## 🔄 Automatic Updates

The leaderboard updates automatically when:

1. **Order Status Changes**
   - Pending/Payment Received → Done (+credits)
   - Done → Canceled (-credits)
   - Canceled → Done (+credits back)

2. **Manual Credit Changes**
   - `/reset-credits` used
   - `/reset-all-credits` used

3. **Real-time**
   - Updates happen immediately
   - No delay or refresh needed
   - Always shows current standings

## 🎨 Leaderboard Details

- **Top 15 Users** - Shows the highest earners
- **Color Coded** - Gold color (0xFFD700)
- **Medals** - 🥇🥈🥉 for top 3 positions
- **Formatted** - Shows credits as $XX.XX
- **Timestamp** - Shows last update time
- **Footer** - Explains auto-update feature

## 🛠️ Management Commands

### Set Leaderboard Channel
```
/set-leaderboard channel:#your-channel
```
- **Permission**: Administrator
- **Effect**: Creates/moves leaderboard to specified channel
- **Note**: If leaderboard exists elsewhere, it moves to new channel

### Remove Leaderboard
```
/remove-leaderboard
```
- **Permission**: Administrator
- **Effect**: Stops auto-updates and removes leaderboard
- **Note**: The message remains but won't update anymore

## 💡 Best Practices

### Channel Setup
1. **Create dedicated channel** - e.g., `#leaderboard` or `#credits`
2. **Set permissions** - Consider making it read-only for members
3. **Pin the message** - Makes it easy to find
4. **Clear other messages** - Keep channel clean for visibility

### Recommended Permissions
```
Channel: #leaderboard
- Bot: Send Messages, Embed Links, Read Message History
- Members: View Channel, Read Message History
- Members: Send Messages ❌ (optional - keep it clean)
```

## 🔧 Troubleshooting

### Leaderboard not updating
1. Check bot has permissions in the channel
2. Verify leaderboard is set: `/set-leaderboard` again
3. Check bot is online
4. Try removing and re-adding: `/remove-leaderboard` then `/set-leaderboard`

### Message disappeared
- If message is deleted, run `/set-leaderboard` again
- Bot will create a new message
- Old message ID is automatically replaced

### Wrong channel
- Just run `/set-leaderboard` with the new channel
- Leaderboard moves automatically

### No users showing
- Leaderboard shows users with credits > $0
- Complete some orders first
- Use `/credits-leaderboard` to verify users have credits

## 📈 Use Cases

### Competition
- Display live rankings
- Motivate users to earn more
- Transparent earnings tracking

### Transparency
- Everyone sees current standings
- No hidden calculations
- Real-time updates build trust

### Motivation
- Users can track their progress
- See how close they are to next rank
- Competitive environment

### Management
- Quick overview of top performers
- Identify most active users
- Track team performance

## 🎯 Tips

1. **Announce the leaderboard** - Let users know where to find it
2. **Update regularly** - The bot does this automatically!
3. **Celebrate milestones** - Recognize when users reach top 3
4. **Use with goals** - Combine with monthly earning targets
5. **Keep it visible** - Pin the message or keep channel at top

## 🔄 Migration

### Moving to New Channel
```bash
# Old channel: #old-leaderboard
# New channel: #new-leaderboard

/set-leaderboard channel:#new-leaderboard
```
Done! Leaderboard now shows in new channel.

### Temporary Disable
```bash
/remove-leaderboard
# Leaderboard stops updating

# Later...
/set-leaderboard channel:#leaderboard
# Leaderboard active again with current data
```

## 📊 Example Workflow

1. **Setup**
   ```
   /set-leaderboard channel:#leaderboard
   ```

2. **Users complete orders**
   - Credits update automatically
   - Leaderboard refreshes instantly

3. **Check standings**
   - Users check #leaderboard channel
   - See live rankings

4. **End of month**
   - Take screenshot for records
   - Optionally reset credits
   - Leaderboard updates with new data

## 🎉 Benefits

✅ **No manual work** - Fully automatic
✅ **Always accurate** - Real-time updates
✅ **Transparent** - Everyone sees same data
✅ **Motivating** - Encourages competition
✅ **Professional** - Clean, formatted display
✅ **Reliable** - Updates on every credit change

---

**Need help?** Just run `/set-leaderboard` to get started!


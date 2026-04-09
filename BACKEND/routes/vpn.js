const express = require('express');
const router = express.Router();
const { connectNode, disconnectNode, preauthNode } = require('../controllers/vpnController');
const { auth } = require('../middlewares/authMiddleware');
const UsageLog = require('../models/UsageLog');
const Node = require('../models/Node');

router.post('/preauth', auth, preauthNode);
router.post('/connect', auth, connectNode);
router.post('/disconnect', auth, disconnectNode);

// GET /api/vpn/history — real connection history + usage stats for the user
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    // Fetch completed sessions (disconnected logs) + populate node name
    const sessions = await UsageLog.find({ userId, action: 'disconnected' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('nodeId', 'name city countryCode ipAddress');

    // Aggregate totals
    const allLogs = await UsageLog.find({ userId, action: 'disconnected' });
    const totalBytesIn  = allLogs.reduce((s, l) => s + (l.bytesIn  || 0), 0);
    const totalBytesOut = allLogs.reduce((s, l) => s + (l.bytesOut || 0), 0);
    const totalDuration = allLogs.reduce((s, l) => s + (l.duration || 0), 0);
    const totalSessions = allLogs.length;

    // Weekly usage (last 7 days, bytes per day)
    const now = new Date();
    const weekly = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const start = new Date(day.setHours(0, 0, 0, 0));
      const end   = new Date(day.setHours(23, 59, 59, 999));
      const dayLogs = allLogs.filter(l => l.createdAt >= start && l.createdAt <= end);
      const bytes = dayLogs.reduce((s, l) => s + (l.bytesIn || 0) + (l.bytesOut || 0), 0);
      weekly.push({ label: start.toLocaleDateString('en', { weekday: 'short' }), bytes });
    }

    res.json({
      stats: { totalBytesIn, totalBytesOut, totalDuration, totalSessions },
      weekly,
      sessions: sessions.map(s => ({
        id: s._id,
        node: s.nodeId ? `${s.nodeId.name} — ${s.nodeId.city}` : 'Unknown Server',
        countryCode: s.nodeId?.countryCode || 'US',
        duration: s.duration || 0,
        bytesIn: s.bytesIn || 0,
        bytesOut: s.bytesOut || 0,
        connectedAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error('[HISTORY]', err);
    res.status(500).json({ msg: 'Failed to fetch history' });
  }
});

module.exports = router;

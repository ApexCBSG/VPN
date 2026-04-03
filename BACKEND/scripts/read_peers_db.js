const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const PeerSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  nodeId: mongoose.Schema.Types.ObjectId,
  publicKey: String,
  internalIp: String,
  createdAt: { type: Date, default: Date.now }
});
const WireGuardPeer = mongoose.model('WireGuardPeer', PeerSchema);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const peers = await WireGuardPeer.find().sort({ createdAt: -1 }).limit(5);
  console.log(JSON.stringify(peers, null, 2));
  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});

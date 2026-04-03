const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const NodeSchema = new mongoose.Schema({
  name: String,
  ipAddress: String,
  port: Number,
  publicKey: String
});
const Node = mongoose.model('Node', NodeSchema);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const nodes = await Node.find();
  console.log(JSON.stringify(nodes, null, 2));
  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});

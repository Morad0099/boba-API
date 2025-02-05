import mongoose from "mongoose";

const schema = new mongoose.Schema({
  stores: [Object],
  paymentMethods: [Object],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('StoreSettings', schema);

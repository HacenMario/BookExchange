const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  bio: { type: String, maxlength: 200, default: '' },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  points: { type: Number, default: 0 },
  totalTrades: { type: Number, default: 0 },
  achievements: [{ type: String }],
  favoriteCategories: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.addPoints = async function(points) {
  this.points += points;
  await this.save();
  return this.points;
};

UserSchema.methods.addAchievement = async function(achievement) {
  if (!this.achievements.includes(achievement)) {
    this.achievements.push(achievement);
    await this.save();
  }
};

module.exports = mongoose.model('User', UserSchema);
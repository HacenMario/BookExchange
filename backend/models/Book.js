const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, index: true },
  author: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  excerpt: { type: String, default: '' },
  category: {
    type: String,
    enum: ['رواية', 'علمي', 'ديني', 'تنمية بشرية', 'تاريخي', 'سياسي', 'أدب', 'شعر', 'فلسفة', 'أطفال', 'أخرى'],
    required: true,
    index: true,
  },
  subCategory: { type: String, default: '' },
  tags: [{ type: String, index: true }],
  coverImage: { type: String, default: '' },
  condition: {
    type: String,
    enum: ['جديد', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول'],
    required: true,
  },
  isAvailable: { type: Boolean, default: true, index: true },
  location: { type: String, index: true },
  views: { type: Number, default: 0 },
  wishlistedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
}, { timestamps: true });

// فهارس لتحسين الأداء
BookSchema.index({ title: 'text', author: 'text', tags: 'text' });

BookSchema.methods.updateRating = async function() {
  const reviews = await mongoose.model('BookReview').find({ bookId: this._id });
  if (reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    this.averageRating = Math.round(avg * 10) / 10;
    this.totalRatings = reviews.length;
    await this.save();
  }
};

module.exports = mongoose.model('Book', BookSchema);

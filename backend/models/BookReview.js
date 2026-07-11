const mongoose = require('mongoose');

const BookReviewSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('BookReview', BookReviewSchema);
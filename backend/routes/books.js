const express = require('express');
const auth = require('../middleware/auth');
const Book = require('../models/Book');
const BookReview = require('../models/BookReview');
const router = express.Router();

// ============================================================
// إضافة كتاب
// ============================================================
router.post('/', auth, async (req, res) => {
  try {
    const { title, author, description, category, subCategory, tags, condition, coverImage, location } = req.body;
    if (!title || !author || !category || !condition) {
      return res.status(400).json({ message: '❌ الرجاء ملء الحقول المطلوبة' });
    }
    const book = new Book({
      owner: req.userId,
      title,
      author,
      description: description || '',
      category,
      subCategory: subCategory || '',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      condition,
      coverImage: coverImage || '',
      location: location || '',
      isAvailable: true,
    });
    await book.save();
    res.status(201).json({ message: '✅ تم إضافة الكتاب', book });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// جلب جميع الكتب
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { search, category, city, condition, sort } = req.query;
    const filter = { isAvailable: true };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    if (category) filter.category = category;
    if (city) filter.location = { $regex: city, $options: 'i' };
    if (condition) filter.condition = condition;
    const sortOptions = {};
    if (sort === 'newest') sortOptions.createdAt = -1;
    else if (sort === 'oldest') sortOptions.createdAt = 1;
    else if (sort === 'rating') sortOptions.averageRating = -1;
    else if (sort === 'views') sortOptions.views = -1;
    else sortOptions.createdAt = -1;
    const books = await Book.find(filter)
      .populate('owner', 'name city rating profileImage')
      .sort(sortOptions);
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// كتب المستخدم الحالي
// ============================================================
router.get('/my', auth, async (req, res) => {
  try {
    const books = await Book.find({ owner: req.userId }).populate('owner', 'name').sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// كتب مستخدم معين
// ============================================================
router.get('/user/:userId', async (req, res) => {
  try {
    const books = await Book.find({ owner: req.params.userId, isAvailable: true })
      .populate('owner', 'name')
      .sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// جلب كتاب بواسطة ID
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .populate('owner', 'name email city rating profileImage');
        if (!book) {
            return res.status(404).json({ message: '❌ الكتاب غير موجود' });
        }
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// تحديث كتاب
// ============================================================
router.put('/:id', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: '❌ غير موجود' });
    if (book.owner.toString() !== req.userId) return res.status(403).json({ message: '❌ غير مصرح' });
const { 
    title, author, description, category, subCategory, 
    tags, condition, coverImage, location, isAvailable,
    excerpt  // <-- هذا هو السطر الجديد
} = req.body;

if (title) book.title = title;
if (author) book.author = author;
if (description !== undefined) book.description = description;
if (category) book.category = category;
if (subCategory !== undefined) book.subCategory = subCategory;
if (tags !== undefined) book.tags = tags ? tags.split(',').map(t => t.trim()) : [];
if (condition) book.condition = condition;
if (coverImage !== undefined) book.coverImage = coverImage;
if (location !== undefined) book.location = location;
if (isAvailable !== undefined) book.isAvailable = isAvailable;
if (excerpt !== undefined) book.excerpt = excerpt;  // <-- هذا السطر الجديد

await book.save();
    res.json({ message: '✅ تم التحديث', book });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// حذف كتاب
// ============================================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: '❌ غير موجود' });
    if (book.owner.toString() !== req.userId) return res.status(403).json({ message: '❌ غير مصرح' });
    await BookReview.deleteMany({ bookId: book._id });
    await book.deleteOne();
    res.json({ message: '✅ تم الحذف' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// قائمة الرغبات
// ============================================================
router.post('/:id/wishlist', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: '❌ غير موجود' });
    const index = book.wishlistedBy.indexOf(req.userId);
    if (index === -1) {
      book.wishlistedBy.push(req.userId);
      await book.save();
      res.json({ message: '✅ أضيف إلى قائمة الرغبات', wishlisted: true });
    } else {
      book.wishlistedBy.splice(index, 1);
      await book.save();
      res.json({ message: '✅ أزيل من قائمة الرغبات', wishlisted: false });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// إضافة تقييم للكتاب
// ============================================================
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: '❌ غير موجود' });
    const existing = await BookReview.findOne({ bookId: book._id, userId: req.userId });
    if (existing) return res.status(400).json({ message: '❌ قمت بتقييم هذا الكتاب مسبقاً' });
    const review = new BookReview({ bookId: book._id, userId: req.userId, rating, comment: comment || '' });
    await review.save();
    await book.updateRating();
    res.json({ message: '✅ تم إضافة التقييم' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

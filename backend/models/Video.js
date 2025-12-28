const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  thumbnail: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  sensitivityStatus: {
    type: String,
    enum: ['pending', 'analyzing', 'safe', 'flagged', 'error'],
    default: 'pending'
  },
  sensitivityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  sensitivityDetails: {
    violence: { type: Number, default: 0 },
    adult: { type: Number, default: 0 },
    language: { type: Number, default: 0 },
    drugs: { type: Number, default: 0 },
    disturbing: { type: Number, default: 0 },
    rating: { type: String, default: 'G' },
    analysisDetails: { type: mongoose.Schema.Types.Mixed },
    detections: { type: mongoose.Schema.Types.Mixed }
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    default: 'uncategorized'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'private'
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  externalUrl: {
    type: String,
    default: ''
  },
  isExternal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
videoSchema.index({ owner: 1, createdAt: -1 });
videoSchema.index({ title: 'text', description: 'text' });
videoSchema.index({ processingStatus: 1 });
videoSchema.index({ sensitivityStatus: 1 });

module.exports = mongoose.model('Video', videoSchema);

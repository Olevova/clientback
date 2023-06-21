const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  id: String,
  comments: [
    {
      id: Number,
      body: String,
      postId: String,
      user: {
        id: String,
        username: String
      }
    }
  ],
  total: Number,
  skip: Number,
  limit: Number
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
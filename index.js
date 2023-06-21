const express = require("express");
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http').Server(app);
const router = require('./router');
const { Server } = require('socket.io');
const Comment = require('./models/chatModels');
const { v4: uuidv4 } = require('uuid');

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(router);

// Підключення до бази даних
mongoose.connect('mongodb+srv://olevova1983:olevova1983@cluster0.qu7icj6.mongodb.net/comments', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

const io = new Server(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  socket.on('join', ({ chat }) => {
    socket.join(chat);
  });

  console.log('Client connected');

  socket.on('getComments', () => {
    Comment.find()
      .then((comments) => {
        socket.emit('updateComments', { comments });
      })
      .catch((error) => {
        console.error('Error retrieving comments:', error);
      });
  });

  socket.on('addComment', (comment) => {
  const { commentText, userParams } = comment;
  const { name } = userParams;
  const chat = userParams.name;

  Comment.findOne({ 'comments.user.username': name }).exec()
    .then((existingUser) => {
      let user;
      if (existingUser) {
        user = existingUser.comments.find((comment) => comment.user.username === name).user;
      } else {
        user = { id: uuidv4(), username: name };
      }

      const newComment = {
        id: Number(new Date()),
        body: commentText,
        postId: uuidv4(),
        user,
      };

      return Comment.findOneAndUpdate({}, { $push: { comments: newComment }, $inc: { total: 1 } }, { new: true }).exec();
    })
    .then((updatedComment) => {
      io.to(chat).emit('newComment', updatedComment); // Відправити оновлений коментар до всіх підключених до каналу користувачів
      return Comment.find().exec();
    })
    .then((comments) => {
      io.to(chat).emit('updateComments', { comments }); // Оновити коментарі для всіх підключених користувачів в межах чату
    })
    .catch((error) => {
      console.error('Error saving comment:', error);
    });
});

socket.on('deleteComment', ({ commentId, userParams }) => {
  const chat = userParams.name;

  Comment.findOneAndUpdate(
    { 'comments.id': commentId },
    { $pull: { 'comments': { 'id': commentId } } },
    { new: true }
  )
    .then((updatedComment) => {
      io.to(chat).emit('newComment', updatedComment); // Відправити оновлений коментар до всіх підключених до каналу користувачів
      return Comment.find().exec();
    })
    .then((comments) => {
      io.to(chat).emit('updateComments', { comments }); // Оновити коментарі для всіх підключених користувачів в межах чату
    })
    .catch((error) => {
      console.error('Error saving comment:', error);
    });
});
  io.on('disconnect', () => {
    console.log('Disconnect');
  });
});

// Підключення до сервера
http.listen("https://clientback1983.onrender.com", () => {
  console.log('Server started on port 5050');
});

const express = require('express');
const { body } = require('express-validator/check');

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/posts', isAuth, feedController.getPosts);

router.post(
  '/posts',
  isAuth,
  [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 }),
  ],
  feedController.createPosts
);

router.get('/posts/:id', isAuth, feedController.getPost);

router.put(
  '/posts/:id',
  isAuth,
  [
    [
      body('title').trim().isLength({ min: 5 }),
      body('content').trim().isLength({ min: 5 }),
    ],
  ],
  feedController.updatePost
);

router.delete('/posts/:id', isAuth, feedController.deletePost);

module.exports = router;

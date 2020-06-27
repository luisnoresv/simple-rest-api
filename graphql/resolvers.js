const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');
const { clearImage } = require('../util/file');
module.exports = {
  // hello() {
  //   return {
  //     text: 'Hello World!',
  //     views: 1234,
  //   };
  // },
  createUser: async ({ userInput }, req) => {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: 'E-Mail is invalid' });
    }
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: 'Password too short!' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    try {
      const existingUser = await User.findOne({ email: userInput.email });
      if (existingUser) {
        const error = new Error('User exists already!');
        throw error;
      }

      const hashedPassword = await bcrypt.hash(userInput.password, 12);

      const user = new User({
        email: userInput.email,
        name: userInput.name,
        password: hashedPassword,
      });

      const createdUser = await user.save();
      return {
        ...createdUser._doc,
        _id: createdUser._id.toString(),
      };
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  },

  login: async ({ email, password }) => {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        const error = new Error('User not found');
        error.code = 401;
        throw error;
      }
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
        const error = new Error('Password is incorrect');
        error.code = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
        },
        process.env.TOKEN_SECRET_KEY,
        { expiresIn: '1h' }
      );
      return { token, userId: user._id.toString() };
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  },

  createPost: async ({ postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated');
      error.code = 401;
      throw error;
    }
    const errors = [];

    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid' });
    }

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid' });
    }

    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        const error = new Error('Invalid User.');
        error.code = 401;
        throw error;
      }
      const post = new Post({
        title: postInput.title,
        content: postInput.content,
        imageUrl: postInput.imageUrl,
        creator: user,
      });

      const createdPost = await post.save();
      user.posts.push(createdPost);
      await user.save();

      return {
        ...createdPost._doc,
        _id: createdPost._id.toString(),
        createdAt: createdPost.createdAt.toISOString(),
        updatedAt: createdPost.updatedAt.toISOString(),
      };
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  },
  posts: async ({ page }, req) => {
    try {
      if (!req.isAuth) {
        const error = new Error('Not Authenticated');
        error.code = 401;
        throw error;
      }
      if (!page) {
        page = 1;
      }
      const perPage = 2;
      const totalPosts = await Post.find().countDocuments();
      const posts = await Post.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .populate('creator');

      return {
        posts: posts.map((p) => {
          return {
            ...p._doc,
            _id: p._id.toString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
          };
        }),
        totalPosts,
      };
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  },
  post: async ({ id }, req) => {
    try {
      if (!req.isAuth) {
        const error = new Error('Not Authenticated');
        error.code = 401;
        throw error;
      }
      const post = await Post.findById(id).populate('creator');
      if (!post) {
        const error = new Error('Not Found');
        error.code = 404;
        throw error;
      }
      return {
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      };
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  },
  updatePost: async ({ id, postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated');
      error.code = 401;
      throw error;
    }

    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('Not Found');
      error.code = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Not Authorized');
      error.code = 404;
      throw error;
    }

    const errors = [];

    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid' });
    }

    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.content, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid' });
    }

    if (errors.length > 0) {
      const error = new Error('Invalid input.');
      error.data = errors;
      error.code = 422;
      throw error;
    }

    try {
      post.title = postInput.title;
      post.content = postInput.content;
      if (postInput.imageUrl !== 'undefined') {
        post.imageUrl = postInput.imageUrl;
      }
      const updatedPost = await post.save();
      return {
        ...updatedPost._doc,
        _id: updatedPost._id.toString(),
        createdAt: updatedPost.createdAt.toISOString(),
        updatedAt: updatedPost.updatedAt.toISOString(),
      };
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  },
  deletePost: async ({ id }, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated');
      error.code = 401;
      throw error;
    }

    try {
      const post = await Post.findById(id);
      if (!post) {
        const error = new Error('Not Found');
        error.code = 404;
        throw error;
      }

      if (post.creator.toString() !== req.userId.toString()) {
        const error = new Error('Not Authorized');
        error.code = 404;
        throw error;
      }

      clearImage(post.imageUrl);
      await Post.findByIdAndRemove(id);
      const user = await User.findById(req.userId);
      user.posts.pull(id);
      await user.save();
      return true;
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      throw error;
    }
  },
  user: async (args, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('Not User Found');
      error.code = 404;
      throw error;
    }

    return { ...user._doc, _id: user._id.toString() };
  },
  updateStatus: async ({ status }, req) => {
    if (!req.isAuth) {
      const error = new Error('Not Authenticated');
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('Not User Found');
      error.code = 404;
      throw error;
    }

    user.status = status;
    await user.save();

    return { ...user._doc, _id: user._id.toString() };
  },
};

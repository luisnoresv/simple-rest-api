exports.getPosts = (req, res, next) => {
  res.status(200).json({
    posts: [{ title: 'First Posts', content: 'This is the first posts!' }],
  });
};

exports.createPosts = (req, res, next) => {
  const title = req.body.title;
  const content = req.body.content;
  // Create post in db
  res.status(201).json({
    message: 'Post Created successfully',
    post: { id: new Date().toISOString(), title, content },
  });
};

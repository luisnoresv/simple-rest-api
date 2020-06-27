const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const graphqlHttp = require('express-graphql');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');
const { clearImage } = require('./util/file');
// const feedRoutes = require('./routes/feed');
// const authRoutes = require('./routes/auth');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().getTime()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  )
    cb(null, true);
  else cb(null, false);
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlenconded <form></form>
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// // GET /feed/posts
// app.use('/feed', feedRoutes);
// // GET /user/
// app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message, data });
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error('Not Authenticated');
    error.code = 401;
    throw error;
  }

  if (!req.file) {
    return res.status(200).json({ message: 'No file provided' });
  }

  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res.status(201).json({
    message: 'File stored',
    filePath: req.file.path.replace('\\', '/'),
  });
});

app.use(
  '/graphql',
  graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(error) {
      if (!error.originalError) {
        return error;
      }
      const data = error.originalError.data;
      const message = error.message || 'An error ocurred';
      const code = error.originalError.code || 500;
      return { message, status: code, data };
    },
  })
);

mongoose
  .connect(
    'mongodb+srv://luisnoresv:oStWZa0ffnjkFq5x@shop-iw9ut.mongodb.net/messages?retryWrites=true&w=majority',
    { useNewUrlParser: true }
  )
  .then((result) => {
    // const server = app.listen(8080);
    // const io = require('./socket').init(server);
    // io.on('connection', (socket) => {
    //   console.log('Client connected');
    // });
    app.listen(8080);
  })
  .catch((err) => console.log(err));

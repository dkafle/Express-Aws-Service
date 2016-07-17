var express    = require('express');    
var app        = express();             
var bodyParser = require('body-parser');
var AWS        = require('aws-sdk');
var Promise    = require('bluebird');
var fs         = Promise.promisifyAll(require('fs'));
var multer     = require('multer');

//AWS S3 Connection
AWS.config.loadFromPath('./config.json');
var s3 = new AWS.S3();
var s3bucket = 'csv-bucket1';
var marker;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var allKeys;
function listAllKeys(marker, callback)
{
  s3.listObjects({Bucket: s3bucket, Marker: marker}, function(err, data){
    allKeys = data.Contents;

    if(data.IsTruncated)
      listAllKeys(data.NextMarker, callback);
    else
      callback();
  });
}

var getLocalFiles = function (username, callback) {
  username  = username || 'user1';
  var direcotry = './data/' + username;
  var result = [];
  fs.readdir(direcotry, function (err, data) {
    if (err) throw err;
    result.push(data);
  });
};

function listLocalFiles(req, res) {
  var username = req.query.username;
  var location = './data/' + username;
  fs.readdir(location, function(err, data) {
    if (err) throw err;
    res.json(data);
  });
}

var listFiles = function (req, res) {
  listAllKeys(marker, function () {
    console.log('file listing got from bucket');
    res.json(allKeys); 
  });
};

var authenticate = function (req, res) {
  var users = [
    {username:'user1', password:'abc123'},
    {username:'user2', password:'123abc'}
  ];
  var authenticated = false;
  users.forEach(function(item, index) {
    if (item.username === req.body.username) {
      if (item.password === req.body.password) {
        authenticated = true;
      }
    }
  });
  res.json({authenticated: authenticated});
};

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var username = req.query.username;
    cb(null, './data/' + username);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

var upload = multer({storage: storage});

app.post('/upload', upload.single('file'), function(req, res) {
  res.json({msg:'OK'});
});

var download = function (req, res) {
  var filename = req.query.filename;
  var username = req.query.username;
  var path = './data/' + username + '/' + filename;
  fs.readFile(path, 'utf8', function (err, data) {
    if(err) throw err;
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=' + filename,
      'Content-Length': data.length
    });
    console.log(res.headersSent);
    res.send(data);
    console.log(res.headersSent);
    res.json({message:"OK"});
  });
};

var port = process.env.PORT || 8080;
var router = express.Router();

router.get('/', function(req, res) {
    res.json(allKeys);   
});

router.post('/sign-in', authenticate);
router.get('/listLocalFiles', listLocalFiles);
router.get('/download', download);

app.use('/sign-in', authenticate);
app.use('/listFiles', listFiles);
app.use('/listLocalFiles', listLocalFiles);
app.use('/download', download);

app.listen(port);
console.log('Magic happens on port ' + port);
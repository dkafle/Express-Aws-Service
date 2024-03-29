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

/*
s3.createBucket({Bucket: s3bucket}, function() {
  var params = {Bucket: s3bucket, Key: 'myKey', Body: 'Howdy!'};
  s3.putObject(params, function(err, data) {
      if (err)       
        console.log(err)     
      else       
        console.log("Successfully uploaded data to myBucket/myKey");   
   });
});*/

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
  getLocalFiles('user1', function(data){
    console.log(data);
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
    {username:'foo', password:'abc123'},
    {username:'bar', password:'123abc'}
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
    cb(null, './data/user1');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

var upload = multer({storage: storage});

app.post('/upload', upload.single('file'), function(req, res) {
  console.log(req);
  res.json({msg:'ok'});
});

var port = process.env.PORT || 8080;
var router = express.Router();

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json(allKeys);   
});

//router.get('/sign-in', authenticate);
//router.get('/listFiles', listFiles);
router.post('/sign-in', authenticate);

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/sign-in', authenticate);
app.use('/listFiles', listFiles);
app.use('/listLocalFiles', listLocalFiles);
//app.use('/upload', upload);

app.listen(port);
console.log('Magic happens on port ' + port);
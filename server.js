var express    = require('express');    
var app        = express();             
var bodyParser = require('body-parser');
var AWS        = require('aws-sdk');

//AWS S3 Connection
AWS.config.loadFromPath('./config.json');
var s3 = new AWS.S3();
var s3bucket = 'csv-bucket1';
var marker;

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
  console.log(users);
  res.json({result:'ok'});
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


var port = process.env.PORT || 8080;
var router = express.Router();

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
    res.json(allKeys);   
});

//router.get('/sign-in', authenticate);
//router.get('/listFiles', listFiles);
//router.post('/auth', authenticate);

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/listFiles', listFiles);
app.use('/sign-in', authenticate);

app.listen(port);
console.log('Magic happens on port ' + port);
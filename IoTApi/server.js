'use strict';

var port = process.env.PORT || 8000; // first change

var http = require('http');
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var swaggerize = require('swaggerize-express');
var swaggerUi = require('swaggerize-ui');
var path = require('path');

var app = express();
var server = http.createServer(app);

const mapKey = require('./config/azure-keys').mapKey;

require('./util/common').initializeDB();
require('./util/common').initializeEventListener();

app.use(cors());
app.use(bodyParser.json());
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	next();
});

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.engine('ejs', require('ejs').renderFile);

var router = express.Router();
router.use('/bower', express.static('bower_components'));
router.use('/js/lib', express.static('public/js/lib'));
router.use('/js/dist', express.static('public/js/dist'));
router.use('/css/lib', express.static('public/css/lib'));
router.use('/css/dist', express.static('public/css/dist'));

app.use(router);
app.use(require('./components/geo-route'));

app.use('/dashboard', function(req, res) {
	// absolute path as view directory appears to be over-written by swaggerize
	res.render(__dirname + '/public/view/geo-fencing-tool.ejs', { mapKey: mapKey });
});

app.use(swaggerize({
	api: path.resolve('./config/swagger.json'),
	handlers: path.resolve('./handlers'),
	docspath: '/swagger',
	security: './security'
}));

app.use('/docs', swaggerUi({
	docs: '/swagger'
}));


server.listen(port, function () { // fifth and final change
	console.info('App running on %s:%d', this.address().address, this.address().port);
});

// Node requirements
var express = require('express');
var app = express();
var ejsLayouts = require('express-ejs-layouts');

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');
app.set('views', __dirname + '/dest/views');

app.use(ejsLayouts);
app.use(express.static(__dirname + '/dest'));

// index page
app.get('/', function(req, res) {
    res.render('pages/index');
});

// about page
// app.get('/:id', function(req, res) {
//     res.render('pages/details');
// });

app.listen(8080);

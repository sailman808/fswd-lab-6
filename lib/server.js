'use strict';

var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    redis = require('connect-redis');

app.use(cookieParser());
var RedisStore = redis(session);
app.use(session({
  secret: 'Shhhhh!',
  resave: false,
  saveUninitialized: true,
  store: new RedisStore()
}));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.set('views', './views');
app.set('view engine', 'pug');

app.use(function(request, response, next) {
  if (request.session.flash_message) {
    response.locals.flash_message = request.session.flash_message;
    delete request.session.flash_message;
    request.session.save(function() {
      next();
    });
  } else {
    next();
  }
});

app.get("/", function(request, response) {
  response.render('index');
});

// app.get('/:name', function(request, response) {
//   response.render('name', { name: request.params.name });
// });

var models = require('../models');

app.get('/tasks', function(request, response) {
  models.Task.findAll()
    .then(function(tasks) {
      response.render('tasks/tasks', { tasks: tasks });
    });
});

app.get('/tasks/:task_id', function(request, response) {
  console.log(request.session);
  models.Task.findById(request.params.task_id)
    .then(function(task) {
      response.render('tasks/task', { task: task });
    });
});

function redirectToTask(response, task) {
  response.redirect('/tasks/' + task.id);
}

app.post('/tasks/:task_id', function(request, response) {
  models.Task.findById(request.params.task_id)
    .then(function(task) {
      task.name = request.body.todo;
      return task.save();
    }).then(function (task) {
      request.session.flash_message = "Updated successfully!";
      redirectToTask(response, task);
    });
});

app.post('/tasks', function(request, response) {
  models.Task.create({ name: request.body.todo })
    .then(function(task) {
      request.session.flash_message = "Added task " + task.name + " successfully!";
      request.session.save(function() {
        response.redirect("/tasks");
      });
    });
});

app.get('/users/register', function(request, response) {
  response.render('users/register');

});


app.get('/users/login', function(request, response) {
  response.end('/users/login');
});

app.post('/users/login', function(request, response) {
    var user_id = request.body.user_id.trim(),
        password = request.body.password;
    models.User.findOne({
            where: {
                user_id: user_id,
                password: password
            }
        })
        .then(function(user) {
            if (user == null) {
                request.session.flash_message = 'Oops! Wrong username or password. Try again.';
                response.redirect('/users/login');
            } else {
                request.session.flash_message = '';
                request.session.user_id = user.user_id;
                response.redirect('/users/' + user.user_id);
            }
        });
});

app.post('/users/register', function(request, response) {
    var user_id = request.body.user_id.trim(),
        password = request.body.password;
    models.User.findOne({
        where: {
            user_id: user_id
        }
    })
    .then(function(user) {
        console.log(user);
        if (user == null) {
            models.User.create({
                user_id: user_id,
                password: password
            })
            .then(function(task) {
                request.session.flash_message = 'Successfully registered! Please login now.';
                response.redirect('/users/login');
            });
        } else {
            request.session.flash_message = 'That username already exists';
            response.redirect('/users/register');
        };
    });
});

// allow other modules to use the server
module.exports = app;

/**
 *
 * 2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
var oecloud = require('oe-cloud');
var loopback = require('loopback');

oecloud.observe('loaded', function (ctx, next) {
  return next();
})

// oecloud.addContextField('tenantId', {
//   type: "string"
// });

var Customer;
oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  var accessToken = loopback.findModel('AccessToken');
  accessToken.observe("before save", function (ctx, next) {
    var userModel = loopback.findModel("User");
    var instance = ctx.instance;
    userModel.find({ where: { id: instance.userId } }, {}, function (err, result) {
      if (err) {
        return next(err);
      }
      if (result.length != 1) {
        return next(new Error("No User Found"));
      }
      var user = result[0];
      if (user.username === "admin") {
        instance.tenantId = '/default';
      }
      else if (user.username === "iciciuser") {
        instance.tenantId = '/default/icici';
      }
      else if (user.username === "citiuser") {
        instance.tenantId = '/default/citi';
      }
      return next(err);
    });
  });
  oecloud.start();
  oecloud.emit('test-start');
});




var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));

var expect = chai.expect;

var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');

function deleteAllUsers(done) {
  var userModel = loopback.findModel("User");
  userModel.destroyAll({}, {}, function (err) {
    return done(err);
  });
}


var globalCtx = {
  ignoreAutoScope: true,
  ctx: { tenantId: '/default' }
};

var iciciCtx = {
  ctx: { tenantId: '/default/icici' }
};

var citiCtx = {
  ctx: { tenantId: '/default/citi' }
};

var defaultContext = {
  ctx: { tenantId: '/default' }
};


describe(chalk.blue('oe-node-red-nodes Started'), function (done) {
  this.timeout(10000);
  before('wait for boot scripts to complete', function (done) {
    app.on('test-start', function () {
      Customer = loopback.findModel("Customer");
      deleteAllUsers(function (err) {
        return done(err);
      });
    });
  });

  afterEach('destroy context', function (done) {
    done();
  });

  it('t1 create user admin/admin with /default tenant', function (done) {
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
      .post(url)
      .send([{ username: "admin", password: "admin", email: "admin@admin.com" },
      { username: "iciciuser", password: "iciciuser", email: "iciciuser@iciciuser.com" },
      { username: "citiuser", password: "citiuser", email: "citiuser@citiuser.com" }
      ])
      .end(function (err, response) {

        var result = response.body;
        expect(result[0].id).to.be.defined;
        expect(result[1].id).to.be.defined;
        expect(result[2].id).to.be.defined;
        done();
      });
  });

  var adminToken;
  it('t2 Login with admin credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: "admin", password: "admin" })
      .end(function (err, response) {
        var result = response.body;
        adminToken = result.id;
        expect(adminToken).to.be.defined;
        done();
      });
  });

  var icicitoken;
  it('t3 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: "iciciuser", password: "iciciuser" })
      .end(function (err, response) {
        var result = response.body;
        icicitoken = result.id;
        expect(icicitoken).to.be.defined;
        done();
      });
  });


  var cititoken;
  it('t4 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
      .post(url)
      .send({ username: "citiuser", password: "citiuser" })
      .end(function (err, response) {
        var result = response.body;
        cititoken = result.id;
        expect(cititoken).to.be.defined;
        done();
      });
  });


  it("t5 - creating default record in Customer model", function (done) {
    Customer.create({ name: "A", age: 10 }, defaultContext, function (err, r) {
      return done(err);
    });
  });

  it("t6 - creating icici record in Customer model", function (done) {
    Customer.create({ name: "Icici", age: 10 }, iciciCtx, function (err, r) {
      return done(err);
    });
  });

  it("t7 - creating citi record in Customer model", function (done) {
    Customer.create({ name: "citi", age: 10 }, citiCtx, function (err, r) {
      return done(err);
    });
  });

  it("t8.1 - fetching records as default tenant", function (done) {
    api
      .set('Accept', 'application/json')
      .get(basePath + '/Customers?access_token=' + adminToken)
      .send()
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        var results = res.body;


        done();
      });
  });
  it("t8.2 - fetching records as icici tenant", function (done) {
    api
      .set('Accept', 'application/json')
      .get(basePath + '/Customers?access_token=' + icicitoken)
      .send()
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        var results = res.body;

        done();
      });
  });

  it("t8.3 - fetching records as citi tenant", function (done) {
    api
      .set('Accept', 'application/json')
      .get(basePath + '/Customers?access_token=' + cititoken)
      .send()
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        var results = res.body;

        done();
      });
  });

  it("t11.2 - Create employee record by posting into Employee model as icici user - should go into personalized appdb", function (done) {
    var data = {
      name: "IciciEmployee2",
      age: 10
    };
    api
      .set('Accept', 'application/json')
      .post(basePath + '/Employees' + '?access_token=' + icicitoken)
      .send(data)
      .expect(200).end(function (err, res) {
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        done();
      });
  });

  it("t11.2 - fetching Employee records as icici tenant - only record which went to personalized appdb database should be retrieved", function (done) {
    var employeeModel = loopback.findModel("Employee");
    employeeModel.find({}, iciciCtx, function (err, results) {

      done();
    });
  });


  it("t11.3 - fetching Employee records as icici tenant(HTTP)", function (done) {
    api
      .set('Accept', 'application/json')
      .get(basePath + '/Employees?access_token=' + icicitoken)
      .send()
      .expect(200).end(function (err, res) {
        //console.log('response body : ' + JSON.stringify(res.body, null, 4));
        if (err || res.body.error) {
          return done(err || (new Error(res.body.error)));
        }
        var results = res.body;

        done();
      });
  });


});




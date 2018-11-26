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
  // oecloud.attachMixinsToBaseEntity("MultiTenancyMixin");
  oecloud.setBaseEntityAutoscope(['tenantId']);
  return next();
});


var Customer;
oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  var accessToken = loopback.findModel('AccessToken');
  accessToken.observe('before save', function (ctx, next) {
    var userModel = loopback.findModel('User');
    var instance = ctx.instance;
    userModel.find({ where: { id: instance.userId } }, {}, function (err, result) {
      if (err) {
        return next(err);
      }
      if (result.length != 1) {
        return next(new Error('No User Found'));
      }
      var user = result[0];
      instance.ctx = instance.ctx || {};
      if (user.username === 'admin') {
        instance.ctx.tenantId = '/default';
      } else if (user.username === 'iciciuser') {
        instance.ctx.tenantId = '/default/iciciuser';
      } else if (user.username === 'citiuser') {
        instance.ctx.tenantId = '/default/citi';
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
  var userModel = loopback.findModel('User');
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
      Customer = loopback.findModel('Customer');
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
      .send([{ username: 'admin', password: 'admin', email: 'admin@admin.com' },
        { username: 'iciciuser', password: 'iciciuser', email: 'iciciuser@iciciuser.com' },
        { username: 'citiuser', password: 'citiuser', email: 'citiuser@citiuser.com' }
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
      .send({ username: 'admin', password: 'admin' })
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
      .send({ username: 'iciciuser', password: 'iciciuser' })
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
      .send({ username: 'citiuser', password: 'citiuser' })
      .end(function (err, response) {
        var result = response.body;
        cititoken = result.id;
        expect(cititoken).to.be.defined;
        done();
      });
  });


  it('t5 - creating default record in Customer model', function (done) {
    Customer.create({ name: 'A', age: 10 }, defaultContext, function (err, r) {
      return done(err);
    });
  });

  it('t6 - creating icici record in Customer model', function (done) {
    Customer.create({ name: 'Icici', age: 10 }, iciciCtx, function (err, r) {
      return done(err);
    });
  });

  it('t7 - creating citi record in Customer model', function (done) {
    Customer.create({ name: 'citi', age: 10 }, citiCtx, function (err, r) {
      return done(err);
    });
  });

  it('Node-Red Test - Should able to create node red flow', function (done) {
    var flows = [{ 'id': '5b4e055c.3134cc', 'type': 'tab', 'label': 'node-red-test-tenant' },
      { 'id': 'f2978c55.016ab', 'type': 'async-observer', 'z': '5b4e055c.3134cc', 'name': 'node-red-test-tenant', 'modelname': 'Customer', 'method': 'access', 'x': 162, 'y': 191, 'wires': [['f5c48f2.d0e007']] },
      { 'id': 'f5c48f2.d0e007', 'type': 'function', 'z': '5b4e055c.3134cc', 'name': 'node-red-test-tenant', 'func': "console.log('******* test-tenant ********');\nvar loopback = global.get('loopback');\nvar customerModel = loopback.findModel('" + 'Customer' + "');\ncustomerModel.emit(\"notifyCustomer\", msg.callContext);\n\nreturn msg;", 'outputs': 1, 'noerr': 0, 'x': 439, 'y': 165, 'wires': [['9a0d6af6.7e8ec8']] },
      { 'id': '9a0d6af6.7e8ec8', 'type': 'debug', 'z': '5b4e055c.3134cc', 'name': 'node-red-test-tenant', 'active': true, 'console': 'false', 'complete': 'true', 'x': 661, 'y': 147, 'wires': [] }];

    // console.log(accessToken);
    // var postUrl = '/red' + '/flows?access_token=' + adminToken;
    var postUrl = '/red/flows?';
    api.set('Accept', 'application/json')
      .post(postUrl)
      .set('X-Access-Token', adminToken)
      .set('Node-RED-API-Version', 'v2')
      .send({flows})
      .end(function (err, resp) {
        if ( err ) return done(err);
        expect(resp.status).to.be.equal(200);
        done();
      });
  });
});



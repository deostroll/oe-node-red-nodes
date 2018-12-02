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
  it('t2.1 Login with admin credentials', function (done) {
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
  it('t2.2 Login with bpo credentials', function (done) {
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
  it('t2.3 Login with bpo credentials', function (done) {
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


  it('t3.1 - creating default record in Customer model', function (done) {
    Customer.create({ name: 'A', age: 10 }, defaultContext, function (err, r) {
      return done(err);
    });
  });

  it('t3.2 - creating icici record in Customer model', function (done) {
    Customer.create({ name: 'Icici', age: 10 }, iciciCtx, function (err, r) {
      return done(err);
    });
  });

  it('t3.3 - creating citi record in Customer model', function (done) {
    Customer.create({ name: 'citi', age: 10 }, citiCtx, function (err, r) {
      return done(err);
    });
  });

  it('t4.1 - AsyncObserver Test - Creating node-red flow for async observer as admin user', function (done) {
    var code = `
        var loopback = global.get('loopback');
        var customerModel = loopback.findModel("Customer");
        customerModel.emit("notifyCustomer", msg.callContext);
        return msg;
	`;

    var flows = [{ 'id': '5b4e055c.3134cc', 'type': 'tab', 'label': 'node-red-default-tenant' },
      { 'id': 'f2978c55.016ab', 'type': 'async-observer', 'z': '5b4e055c.3134cc', 'name': 'node-red-default-tenant', 'modelname': 'Customer', 'method': 'access', 'x': 162, 'y': 191, 'wires': [['f5c48f2.d0e007']] },
      { 'id': 'f5c48f2.d0e007', 'type': 'function', 'z': '5b4e055c.3134cc', 'name': 'node-red-default-tenant', 'func': code, 'outputs': 1, 'noerr': 0, 'x': 439, 'y': 165, 'wires': [['9a0d6af6.7e8ec8']] },
      { 'id': '9a0d6af6.7e8ec8', 'type': 'debug', 'z': '5b4e055c.3134cc', 'name': 'node-red-default-tenant', 'active': true, 'console': 'false', 'complete': 'true', 'x': 661, 'y': 147, 'wires': [] }];

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

  it('t4.2 - AsyncObserver Test - Ensure that Async Observer is executed', function (done) {
    var customerModel = loopback.findModel('Customer');
    customerModel.on('notifyCustomer', function (payload) {
      console.log(payload.ctx.tenantId);
      return done();
      // expect(payload.ctx.tenantId).to.be.equal("default");
    });
    customerModel.find({}, defaultContext, function (err, result) {
      // do nothing.
      // node-red flow should trigger and it should raise the notifyCustomer event.
    });
  });

  it('t5.1 - SyncObserver Test - Deleting flows', function (done) {
    var postUrl = '/red/flows?';
    api.set('Accept', 'application/json')
      .post(postUrl)
      .set('X-Access-Token', adminToken)
      .set('Node-RED-API-Version', 'v2')
      .send({})
      .end(function (err, resp) {
        if ( err ) return done(err);
        expect(resp.status).to.be.equal(200);
        done();
      });
  });


  it('t5.2 - SyncObserver Test - Creating node-red flow for Sync Observer as admin user', function (done) {
    var code = `
        var loopback = global.get('loopback');
        var customerModel = loopback.findModel("Customer");
        customerModel.emit("notifyCustomer2", msg.callContext);
        msg.next();
        return msg;
	`;

    var flows = [{ 'id': '5b4e055c.3134cc', 'type': 'tab', 'label': 'node-red-default-tenant' },
      { 'id': 'f2978c55.016ab', 'type': 'sync-observer', 'z': '5b4e055c.3134cc', 'name': 'node-red-default-tenant', 'modelname': 'Customer', 'method': 'access', 'x': 162, 'y': 191, 'wires': [['f5c48f2.d0e007']] },
      { 'id': 'f5c48f2.d0e007', 'type': 'function', 'z': '5b4e055c.3134cc', 'name': 'node-red-default-tenant', 'func': code, 'outputs': 1, 'noerr': 0, 'x': 439, 'y': 165, 'wires': [['9a0d6af6.7e8ec8']] },
      { 'id': '9a0d6af6.7e8ec8', 'type': 'debug', 'z': '5b4e055c.3134cc', 'name': 'node-red-default-tenant', 'active': true, 'console': 'false', 'complete': 'true', 'x': 661, 'y': 147, 'wires': [] }];

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

  it('t5.3 - AsyncObserver Test - Ensure that Sync Observer is executed', function (done) {
    var customerModel = loopback.findModel('Customer');
    customerModel.on('notifyCustomer2', function (payload) {
      console.log(payload.ctx.tenantId);
      return done();
      // expect(payload.ctx.tenantId).to.be.equal("default");
    });
    customerModel.find({}, defaultContext, function (err, result) {
      // do nothing.
      // node-red flow should trigger and it should raise the notifyCustomer event.
    });
  });


  it('t6.1 - Create Data Test - Deleting flows', function (done) {
    var postUrl = '/red/flows?';
    api.set('Accept', 'application/json')
      .post(postUrl)
      .set('X-Access-Token', adminToken)
      .set('Node-RED-API-Version', 'v2')
      .send({})
      .end(function (err, resp) {
        if ( err ) return done(err);
        expect(resp.status).to.be.equal(200);
        done();
      });
  });


  it('t5.2 - Create Data, find data, Async remote hook Test - Creating node-red flow as admin user', function (done) {
    var code = `
        var loopback = global.get('loopback');
        var customerModel = loopback.findModel("Customer");
        customerModel.emit("notifyCreateCustomer", msg.callContext);
        msg.next();
        return msg;
	`;

    var flows = [
      {
        'id': '5b4e055c.3134cc',
        'type': 'tab',
        'label': 'node-red-default-tenant'
      },
      {
        'id': '12c1e502.e11ebb',
        'type': 'find-data',
        'z': '5b4e055c.3134cc',
        'name': 'find data',
        'modelname': 'Customer',
        'filter': '{"where" : {"name" : "ATUL"} }',
        'x': 400,
        'y': 240,
        'wires': [
          [
            'd6c90c16.73653'
          ],
          [
            'd6c90c16.73653'
          ]
        ]
      },
      {
        'id': '56580973.116308',
        'type': 'async-after-remote',
        'z': '5b4e055c.3134cc',
        'name': 'async after remote',
        'modelname': 'Customer',
        'method': 'find',
        'x': 120,
        'y': 180,
        'wires': [
          [
            '8c606dd1.06d57',
            '12c1e502.e11ebb'
          ]
        ]
      },
      {
        'id': '81e4c0cd.8456d',
        'type': 'create-data',
        'z': '5b4e055c.3134cc',
        'name': 'create data',
        'modelname': 'Customer',
        'data': '{"name" : "ATUL" }',
        'x': 380,
        'y': 100,
        'wires': [
          [
            'ff1b5279.9e00f',
            'f9deb6dd.246b48'
          ],
          [
            'ff1b5279.9e00f',
            'f9deb6dd.246b48'
          ]
        ]
      },
      {
        'id': '8c606dd1.06d57',
        'type': 'debug',
        'z': '5b4e055c.3134cc',
        'name': '',
        'active': true,
        'tosidebar': true,
        'console': false,
        'tostatus': false,
        'complete': 'false',
        'x': 380,
        'y': 340,
        'wires': []
      },
      {
        'id': 'd1c00a3d.524248',
        'type': 'model-observer',
        'z': '5b4e055c.3134cc',
        'name': 'customer-model-observer',
        'modelname': 'Customer',
        'event': 'testCreate',
        'x': 170,
        'y': 60,
        'wires': [
          [
            '81e4c0cd.8456d'
          ]
        ]
      },
      {
        'id': 'd6c90c16.73653',
        'type': 'oe-logger',
        'z': '5b4e055c.3134cc',
        'flowName': 'node-red-flow',
        'levelOfLog': 'info',
        'complete': 'false',
        'x': 620,
        'y': 240,
        'wires': []
      },
      {

        'id': 'f9deb6dd.246b48',
        'type': 'function',
        'z': '5b4e055c.3134cc',
        'name': 'fn node to raise event',
        'func': "\n        var loopback = global.get('loopback');\n        var customerModel = loopback.findModel(\"Customer\");\n        customerModel.emit(\"notifyCreateCustomer\", msg.callContext);\n        msg.next();\n        return msg;\n\t",
        'outputs': 1,
        'noerr': 0,
        'x': 590,
        'y': 180,
        'wires': [
          []
        ]
      },
      {
        'id': 'ff1b5279.9e00f',
        'type': 'debug',
        'z': '5b4e055c.3134cc',
        'name': '',
        'active': true,
        'tosidebar': true,
        'console': false,
        'tostatus': false,
        'complete': 'false',
        'x': 610,
        'y': 100,
        'wires': []
      },
      {
        'id': 'ef090fef.ea73f',
        'type': 'async-before-remote',
        'z': '5b4e055c.3134cc',
        'name': 'async before remote',
        'modelname': 'Customer',
        'method': 'find',
        'x': 100,
        'y': 260,
        'wires': [
          [
            '8c606dd1.06d57'
          ]
        ]
      },
      {

        'id': '781084fc.d8625c',
        'type': 'sync-observer',
        'z': '5b4e055c.3134cc',
        'name': 'sync observer',
        'modelname': 'Customer',
        'method': 'access',
        'x': 120,
        'y': 380,
        'wires': [
          [
            '66e67b54.09bfb4'
          ]
        ]
      },
      {

        'id': '66e67b54.09bfb4',
        'type': 'sync-observer-end',
        'z': '5b4e055c.3134cc',
        'name': 'sync end',
        'x': 330,
        'y': 400,
        'wires': []
      }
    ];

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

  it('t5.3 - Create Data, find data, Async remote hook Test - Ensure that flow executed with all nodes', function (done) {
    var customerModel = loopback.findModel('Customer');
    customerModel.emit('testCreate', defaultContext);
    customerModel.on('notifyCreateCustomer', function (payload) {
      console.log(payload.ctx.tenantId);
      customerModel.find(  { where: { name: 'ATUL'} }, defaultContext, function (err, result) {
        if (err) {
          return done(err);
        }
        expect(result.length).to.be.equal(1);

        var url = '/api/customers';
        api.set('Accept', 'application/json')
          .get(url)
          .set('X-Access-Token', adminToken)
          .set('Node-RED-API-Version', 'v2')
          .end(function (err, resp) {
            if ( err ) return done(err);
            expect(resp.status).to.be.equal(200);
            return done();
          });
      });
      // expect(payload.ctx.tenantId).to.be.equal("default");
    });
  });
});



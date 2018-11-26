/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
const oecloud = require('oe-cloud');
const loopback = require('loopback');


oecloud.observe('loaded', function (ctx, next) {
  oecloud.attachMixinsToBaseEntity('MultiTenancyMixin');
  oecloud.setBaseEntityAutoscope(['tenantId']);
  return next();
});

global.it = function () {};
oecloud.boot(__dirname, function (err) {
  var m = loopback.findModel('Model');
  m.setOptions = function () {
    return { ctx: { tenantId: '/anonymous'}};
  };
  var accessToken = loopback.findModel('AccessToken');
  accessToken.observe('before save', function (ctx, next) {
    var userModel = loopback.findModel('User');
    var instance = ctx.instance;
    userModel.find({ where: {id: instance.userId} }, {}, function (err, result) {
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
      } else if (user.username === 'evuser') {
        instance.ctx.tenantId = '/default/infosys/ev';
      } else if (user.username === 'infyuser') {
        instance.ctx.tenantId = '/default/infosys';
      } else if (user.username === 'bpouser') {
        instance.ctx.tenantId = '/default/infosys/bpo';
      }
      console.log(instance.ctx);
      return next(err);
    });
  });

  oecloud.start();
  oecloud.emit('test-start');
});


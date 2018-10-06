/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
var oecloud = require('oe-cloud');
oecloud.observe('loaded', function (ctx, next) {
  oecloud.attachMixinsToBaseEntity("VersionMixin");
  oecloud.attachMixinsToBaseEntity("AuditFieldsMixin");
  oecloud.attachMixinsToBaseEntity("HistoryMixin");
  oecloud.attachMixinsToBaseEntity("SoftDeleteMixin");
  return next();
})

oecloud.boot(__dirname, function (err) {
  oecloud.start();
  oecloud.emit('test-start');
});


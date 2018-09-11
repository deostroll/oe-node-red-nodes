/**
 * 
 * ©2016 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 * 
 */
var loopback = require('loopback');
module.exports = function(RED) {

    function SyncObserverEndNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {

            msg.next(msg);
        });

        node.on('close', function() {

        });
    }

    RED.nodes.registerType("sync-observer-end", SyncObserverEndNode);
}

// Copyright (c) 2020 Siemens

/**
 * This module is a helper for any JS function needed in wysiwyg
 *
 * @module js/wysiwygHelper
 */

import _ from 'lodash';
import Debug from 'Debug';
import appCtxSvc from 'js/appCtxService';

var exports = {};

var trace = new Debug( 'wysiwygCanvasService' );
/**
 * Create tree node.
 *
 * @param {String} name - Node name.
 *
 * @return {Object} Node object.
 */
var createNode = function( name ) {
    var __exp = {
        name: name,
        displayName: name,
        children: []
    };

    return __exp;
};

/**
 * Create category
 *
 * @param {String} name - Node name.
 *
 * @return {Object} Category object.
 */
var createCategory = function( name, ctx, node ) {
    name = name ? name : '';
    ctx = ctx ? ctx : [];

    var _exp = {};

    _exp._node = node ? node : createNode( name );

    _exp._isFiltered = false;

    _exp._ctx = name ? ctx.concat( name ) : ctx;

    _exp.children = [];

    _exp.expanded = true;

    _exp.addChild = function( node ) {
        _exp.children.push( node );
    };

    _exp.getNode = function() {
        return _exp._node;
    };

    _exp.addChildNode = function( categoryNames, node ) {
        var name = _.first( categoryNames );
        if( _.isEmpty( name ) || name === 'none' ) {
            var cat = createCategory( node.name, _exp._ctx, node );
            _exp.addChild( cat );
            _exp[ node.name ] = cat;
        } else {
            var category = _exp[ name ];
            if( !category ) {
                category = createCategory( name, _exp._ctx );
                _exp[ name ] = category;
                _exp.addChild( category );
            }
            category.addChildNode( _.tail( categoryNames ), node );
        }
    };

    return _exp;
};

/**
 * Process wysiwyg.json input to tree input.
 *
 * @return {Object} Tree structure.s
 */
export let processWysiwygJson = function() {
    try {
        var response = appCtxSvc.getCtx( 'wysiwyg.widgets.configurations' );
        response.data.sort( function( a, b ) {
            return a.priority - b.priority;
        } );
        var top = createCategory();
        _.forEach( response.data, function( node ) {
            exports.buildNode( node );
            top.addChildNode( [ node.category, node.subCategory ], node );
        } );

        return {
            wysiwygJson: top
        };
    } catch ( e ) {
        trace( 'processWysiwygJson : Widgets configurations not available' );
    }
};

/**
 * Build node in wysiwyg.json to fit traverse requirement.
 *
 * @param {Object} node - 1st level JSON node in wysiwyg.json.
 */
export let buildNode = function( node ) {
    node.title = node.apiUrl ? 'Apollo - UI elements' : node.name;
};

export let displayFilteredNodes = function( data, filteredNodes ) {
    if( filteredNodes ) {
        data.wysiwygJson.children = filteredNodes;
    }
};

exports = {
    processWysiwygJson,
    buildNode,
    displayFilteredNodes
};
export default exports;

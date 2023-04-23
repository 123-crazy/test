// Copyright (c) 2019 Siemens

/* global
 define
 */

/**
 * Note: This module provides the node template support.
 *
 * @module js/graphTemplateService
 */
import app from 'app';
import AwHttpService from 'js/awHttpService';
import AwPromiseService from 'js/awPromiseService';
import AwTemplateCacheService from 'js/awTemplateCacheService';
import _ from 'lodash';
import logSvc from 'js/logger';

var exports = {};

/**
 * Cached reference to the various AngularJS and AW services.
 */

var _parser = new DOMParser();

/**
 * Cache the parsed template element by template ID
 */
var _templateElemCache = {};

/**
 * The suffix of the editable property
 */
export let EDITABLE_PROPERTY_SURFIX = '_editable';

/**
 * Get the the template string of specific url
 *
 * @param nodeTemplates the node templates
 */
export let loadTemplates = function( nodeTemplates ) {
    var deferred = AwPromiseService.instance.defer();
    var loadList = [];
    var templateIds = [];
    var templateMap = {};
    _.forEach( nodeTemplates, function( template, templateId ) {
        var templateUrl = template.templateUrl;
        if( templateUrl && templateId ) {
            // multiple level template doens't support word wrap
            if( template.subTemplateIds && template.textOverflow && template.textOverflow !== 'NONE' ) {
                logSvc.error( 'Word wrap is not supported for multiple level node template. Template ID:',
                    templateId );
            }

            templateIds.push( templateId );
            loadList.push( loadTemplate( templateUrl ) );
        }
    } );

    AwPromiseService.instance.all( loadList ).then( function( templateContents ) {
        if( templateIds.length === templateContents.length ) {
            for( var i = 0; i < templateIds.length; i++ ) {
                templateMap[ templateIds[ i ] ] = templateContents[ i ];
            }
            deferred.resolve( templateMap );
        }
        deferred.reject();
    } );

    return deferred.promise;
};

var loadTemplate = function( url ) {
    var deferred = AwPromiseService.instance.defer();
    var templateUrl = app.getBaseUrlPath() + url;
    var htmlString = AwTemplateCacheService.instance.get( templateUrl );
    if( htmlString ) {
        deferred.resolve( htmlString );
    } else {
        AwHttpService.instance.get( templateUrl ).success( function( response ) {
            var htmlString = response;

            if( htmlString ) {
                /**
                 * Cache for future requests to the same URL
                 */
                AwTemplateCacheService.instance.put( templateUrl, htmlString );
                deferred.resolve( htmlString );
            }
        } );
    }

    return deferred.promise;
};

/**
 * The const definitions for the template prepropressing
 */
var clipPathDef = '<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" style=\"display: none\">' +
    '<clipPath id=\'{PropertyBinding("rectClipId")}\'><rect width=\'{SDFSizePropertyBinding("getWidthValue")}\' height=\'{SDFSizePropertyBinding("getHeightValue")}\'';
var dropShadowBindStr = ' {PropertyBinding("nodeFilterStyle")}';
var clipPathRef = 'url(#{PropertyBinding("rectClipId")})';

var borderRectHead = '<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" style=\"display: none\">' +
    '<rect class=';
var borderRectSeg = ' width=\'{SDFSizePropertyBinding("getWidthValue")}\' height=\'{SDFSizePropertyBinding("getHeightValue")}\' stroke=\'{PropertyBinding("';

/**
 * Prepropress template: Add the round corner and drop shadow features
 *
 * @param {*} templateEle the template element needs to handle
 * @param {*} preConfig the config data for the template
 */
var prePropressTemplate = function( templateEle, preConfig ) {
    if( preConfig ) {
        if( preConfig.dropShadow ) {
            var templateCss = templateEle.getAttribute( 'class' );
            templateEle.setAttribute( 'class', templateCss + dropShadowBindStr );
        }
        if( preConfig.roundCorner ) {
            // if the clipPath is not defined in template
            if( templateEle.getElementsByTagName( 'clipPath' ).length === 0 ) {
                var rx = preConfig.roundCorner.rx ? preConfig.roundCorner.rx : 10;
                var ry = preConfig.roundCorner.ry ? preConfig.roundCorner.ry : 10;
                var borderCss = preConfig.roundCorner.borderStyleClass ? preConfig.roundCorner.borderStyleClass : 'aw-graph-node-border';
                var stroke = preConfig.roundCorner.strokeColorProperty ? preConfig.roundCorner.strokeColorProperty : 'node_fill_color';

                var clipPath = clipPathDef + ' rx="' + rx + '" ry="' + ry + '"></rect></clipPath>' + '</svg>';
                var formattedClipPath = clipPath.replace( /&quot;/g, '\'' );

                var xmlNode = _parser.parseFromString( formattedClipPath, 'text/xml' );

                var firstGNode = templateEle.getElementsByTagName( 'g' )[ 0 ];

                firstGNode.setAttribute( 'clip-path', clipPathRef );
                templateEle.insertBefore( xmlNode.getElementsByTagName( 'clipPath' )[ 0 ], firstGNode );

                // To insert the border rectangle
                var borderRect = borderRectHead + '"' + borderCss + '"' + borderRectSeg + stroke + '")}\'' +
                    ' rx="' + rx + '" ry="' + ry + '"/>' + '</svg>';
                var insertPos = firstGNode.firstElementChild;

                // IE doesn't support children property
                var childNodeList = firstGNode.childNodes;
                var lastRectEle = 0;

                for( var i = 0; i < childNodeList.length; i++ ) {
                    insertPos = childNodeList[ i ];
                    if( childNodeList[ i ].nodeName === 'rect' ) {
                        lastRectEle = i;
                    }
                }

                if( lastRectEle < childNodeList.length - 1 ) {
                    insertPos = childNodeList[ lastRectEle + 1 ];
                }

                xmlNode = _parser.parseFromString( borderRect, 'text/xml' );
                firstGNode.insertBefore( xmlNode.getElementsByTagName( 'rect' )[ 0 ], insertPos );
            }
        }
    }
};

/**
 * Get the DOM element by template ID by parsing the template string.
 * Only parse the template string once and cache the template element by template ID.
 *
 * @param templateId the template id
 * @param templateContent the template content
 * @param preConfig config for the template
 *
 * @return the DOM element with id equals the template ID
 */
export let getTemplateElement = function( templateId, templateContent, preConfig ) {
    var templateEle = null;
    if( templateId && templateContent ) {
        if( _templateElemCache[ templateId ] ) {
            templateEle = _templateElemCache[ templateId ];
        } else {
            var formattedTemplate = templateContent.replace( /&quot;/g, '\'' );
            var xmlNode = _parser.parseFromString( formattedTemplate, 'text/xml' );
            templateEle = xmlNode.getElementById( templateId );
            if( templateEle ) {
                // Handle the default customized feature for the template
                prePropressTemplate( templateEle, preConfig );

                if( _.isString( templateEle.className ) ) {
                    templateEle.className += ' aw-graph-node';
                } else {
                    templateEle.className.baseVal += ' aw-graph-node';
                }

                // cache the template element
                _templateElemCache[ templateId ] = templateEle;
            }
        }
    }

    return templateEle;
};

export default exports = {
    EDITABLE_PROPERTY_SURFIX,
    loadTemplates,
    getTemplateElement
};
/**
 *
 * @member graphTemplateService
 * @memberof NgServices
 */
app.factory( 'graphTemplateService', () => exports );

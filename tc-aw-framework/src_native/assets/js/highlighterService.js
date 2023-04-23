// Copyright (c) 2020 Siemens

/**
 * Service to set a highlighter.
 *
 * @module js/highlighterService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cfgSvc from 'js/configurationService';
import conditionSvc from 'js/conditionService';
import _ from 'lodash';
import declUtils from 'js/declUtils';

let _decoratorProvidersPromise;

/**
 * Processes the decorators
 *
 * @param {Object} decoratatorProviders highlight decoratator providers
 * @param {Object|null} searchTermsToHighlight - search terms to highlight with.
 */
function _processDecorators( decoratatorProviders, searchTermsToHighlight ) {
    _.forEach( decoratatorProviders, function( decoratorJson ) {
        if( decoratorJson.conditions ) {
            var declViewModel = {};

            var evaluationEnv = {
                ctx: appCtxSvc.ctx
            };
            var verdict = true;
            for( var condition in decoratorJson.conditions ) {
                var expression = decoratorJson.conditions[ condition ].expression;
                verdict = verdict && conditionSvc.parseExpression( declViewModel, expression, evaluationEnv );
            }
            if( verdict && searchTermsToHighlight && searchTermsToHighlight.length > 0 ) {
                var highlightMatchString = searchTermsToHighlight.join( '|' );
                highlightMatchString = exports.escapeRegexSpecialChars( highlightMatchString );
                var regEx = new RegExp( '(<a href=.)?' + '(' + highlightMatchString + ')', 'gi' );
                var ctx = appCtxSvc.getCtx( 'highlighter' );
                if( ctx === undefined ) {
                    ctx = {};
                    appCtxSvc.registerCtx( 'highlighter', ctx );
                }
                ctx.regEx = regEx;
                ctx.style = decoratorJson.highlightStyle;
                appCtxSvc.updateCtx( 'highlighter', ctx );
            } else {
                if( appCtxSvc.getCtx( 'highlighter' ) ) {
                    appCtxSvc.unRegisterCtx( 'highlighter' );
                }
            }
        }
    } );
}

var exports = {};

/**
 * escapeRegexSpecialChars
 *
 * @function escapeRegexSpecialChars
 * @memberOf NgServices.awSearchService
 * @param {Object} regex - regex string.
 * @return {String} escaped regex string
 */
export let escapeRegexSpecialChars = function( regex ) {
    return regex.replace( /[-\/\\^$+.()[\]{}]/g, '\\$&' );
};
/**
 * Sets cell list decorators.
 *
 * @param {Object} searchTermsToHighlight - search terms to highlight with.
 */
export let highlightKeywords = function( searchTermsToHighlight ) {
    var unloadedDepModules = {};

    var sublocationName = appCtxSvc.ctx.sublocation ? appCtxSvc.ctx.sublocation.nameToken : null;
    if( _decoratorProvidersPromise ) {
        _decoratorProvidersPromise.then( function( _decoratorProviders ) {
            _.forEach( _decoratorProviders, function( decoratorJson ) {
                if( ( !sublocationName || sublocationName === decoratorJson.subLocationName ) &&
                    !_.isEmpty( decoratorJson.deps ) ) {
                    unloadedDepModules[ decoratorJson.deps ] = true;
                }
            } );

            // See if loading modules is necessary
            if( !_.isEmpty( unloadedDepModules ) ) {
                var depsArray = Object.keys( unloadedDepModules );

                declUtils.loadDependentModules( depsArray ).then( function() {
                    _processDecorators( _decoratorProviders, searchTermsToHighlight );
                } );
            } else {
                _processDecorators( _decoratorProviders, searchTermsToHighlight );
            }
        } );
    }
};

export let loadConfiguration = function() {
    _decoratorProvidersPromise = cfgSvc.getCfg( 'highlighter', false, true );
};

exports = {
    escapeRegexSpecialChars,
    highlightKeywords,
    loadConfiguration
};
export default exports;

loadConfiguration();

app.factory( 'highlighterService', () => exports );

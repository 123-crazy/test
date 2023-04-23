// Copyright (c) 2020 Siemens

/* eslint-disable new-cap */
/* eslint-disable max-statements-per-line */

/**
 *
 * @module js/extended-tooltip.controller
 */
import app from 'app';
import logger from 'js/logger';
import parsingUtils from 'js/parsingUtils';
import utils from 'js/popupUtils';
import domUtils from 'js/domUtils';
import 'js/viewModelService';
import declarativeDataCtxSvc from 'js/declarativeDataCtxService';
import { popupService } from 'js/popupService';
import { promiseThrottle } from 'js/promiseThrottle';
import _ from 'lodash';
import wcagService from 'js/wcagService';

let dom = domUtils.DOMAPIs;
let throttleDuration = 1500;
let showDuration = 250;
let hideDuration = 100;

app.controller( 'extendedTooltipController', [
    '$scope',
    '$element',
    '$attrs',
    '$parse',
    'viewModelService',
    function( scope, element, attr, $parse, viewModelSvc ) {
        // legacy vars
        let declViewModel = null;
        let tooltipObject = null;
        let showId = null;
        let hideId = null;
        let _kcEsc = 27;

        let _popupRef = null;
        let _progress = { busy: false };
        let promisedShow = promiseThrottle( popupService.show, throttleDuration ); // promised based throttle
        let rawOptions = $parse( attr.extendedTooltipOptions )() || {};
        let target = element[ 0 ];
        let focusTarget = target;
        let options = null;
        let updatedSubPanelContext = null;

        // other util functions
        let processConfig = () => {
            let config = attr.extendedTooltip;
            let context = attr.extendedTooltipContext;
            let needRetrieve = false;
            try {
                declViewModel = viewModelSvc.getViewModel( scope, true );
            } catch ( err ) {
                declViewModel = null;
                logger.warn( `No context declViewModel detected for element: ${element}` );
            }

            try {
                // config(attr.extendedTooltip) could be in below cases:
                // 1. object
                // 2. string values
                // 2.1 plain literal, eg: "myTooltipView",  "data.tooltipForEffectivity"
                // 2.2 json object literal, eg: '{"extendedTooltipContent":"myContent"}'
                tooltipObject = _.isString( config ) ? JSON.parse( config ) : _.cloneDeep( config );
            } catch ( err ) {
                needRetrieve = true;
                // case object literal: extended-tooltip='{extendedTooltipContent: "myContent"}'
                if( config.indexOf( '{' ) !== -1 ) {
                    tooltipObject = $parse( config )();
                    needRetrieve = false;
                }
            }

            if( needRetrieve ) {
                // case: extended-tooltip="data.tooltipForEffectivity"
                let attrPropName = config.substr( config.indexOf( '.' ) + 1 );
                if( declViewModel ) { tooltipObject = viewModelSvc.getViewModelObject( declViewModel, attrPropName ); }
                // case if it's not in element's view model data property
                tooltipObject = tooltipObject || { view: attrPropName };
            }

            // handling of tooltip content when there is no view/viewmodel in ui element's json file
            if( tooltipObject.extendedTooltipContent ) {
                let content = tooltipObject.extendedTooltipContent;
                if( declViewModel && _.startsWith( content, '{{' ) ) {
                    let viewModelProp = parsingUtils.getStringBetweenDoubleMustaches( content );
                    content = parsingUtils.parentGet( declViewModel._internal.origCtxNode, viewModelProp ) || content;
                }
                tooltipObject.content = content;
            }

            // init subPanelContext, subPanelContext always should be an object.
            // there are cases where application(ACE) pass in string values due to wrong usage.
            if( !tooltipObject.subPanelContext && context ) {
                // retrieve context by get, so that we can support any level path access: eg: data.tooltips.tooltip1
                let contextValue = _.get( scope, context );
                if( typeof contextValue === 'object' ) {
                    tooltipObject.subPanelContext = contextValue || {};
                } else {
                    // REMOVE FUTURE
                    // this is absurd which introduced by old implementation hence misleading applications to the wrong places.
                    scope.subPanelContext = contextValue;
                    logger.error( 'extendedTooltipContext always should be an object, please correct the usage!' );
                }
            }

            // Interpolation of commandContext inside tooltip subPanelContext
            if( tooltipObject.subPanelContext ) {
                // To avoid modifying original scope, clone it first
                updatedSubPanelContext = _.clone( tooltipObject.subPanelContext );

                scope.commandContext = scope.context;
                declarativeDataCtxSvc.applyScope( declViewModel, updatedSubPanelContext, null, scope,
                    null );
            }
        };
        let hideInternal = () => {
            if( _popupRef ) {
                popupService.hide( _popupRef );
                _popupRef = null;
            }
        };
        let showInternal = () => {
            _progress.busy = true;
            let locals = {
                declView: tooltipObject.view || null,
                content: tooltipObject.content || null
            };
            promisedShow( {
                templateUrl: '/html/extended-tooltip.popup-template.html',
                context: scope,
                subPanelContext: updatedSubPanelContext,
                locals,
                options
            } );
        };

        // support to move hover into tooltip
        let popupClosed = () => {
            _progress.busy = false;
            _popupRef = null;
        };
        let popupOpened = ( ele ) => {
            _progress.busy = false;
            _popupRef = ele;

            // enable move-in feature when tooltip shows up
            // LCS-395366: Tooltip appears even if mouse moved away from the "tipped" element
            setTimeout( () => {
                if( _popupRef ) {
                    _popupRef.addEventListener( 'mouseenter', ( event ) => {
                        event.stopImmediatePropagation();
                        clearTimeout( hideId );
                    } );

                    _popupRef.addEventListener( 'mouseleave', ( event ) => {
                        event.stopImmediatePropagation();
                        hideInternal();
                    } );

                    // catch and stop inner click event to prevent pollution
                    _popupRef.addEventListener( 'click', ( event ) => {
                        event.stopImmediatePropagation();
                        event.preventDefault();
                    } );
                }
            }, 150 );
        };

        let clearNativeTitle = () => {
            // case1: aw-command already had logic built in to remove the title attribute when extended tooltip is provided
            if( rawOptions.isCommand ) {
                if( scope ) {
                    let context = attr.extendedTooltipContext;
                    if( context ) {
                        let contextValue = _.get( scope, context );
                        if( contextValue && !contextValue.enabled ) {
                            utils.removeNativeTitle( target );
                        }
                    }
                }
            } else { // case2  non command
                utils.removeNativeTitle( target );
            }
        };

        let show = ( event ) => {
            if( _progress.busy || _popupRef ) { return; }
            if( scope && scope.popupOpen ) { return; }

            // prevent to show default tooltip
            clearNativeTitle();
            event.preventDefault();
            event.stopImmediatePropagation();

            // close others
            utils.closeExistingTooltip();

            // start to show
            if( !options ) {
                // need to parse again in case uninitialized value in link stage
                rawOptions = $parse( attr.extendedTooltipOptions )() || {};
                options = utils.processTooltipOptions( rawOptions, target, popupOpened, popupClosed );
            }
            processConfig();
            showId = setTimeout( showInternal, showDuration );
        };

        let hide = ( event ) => {
            // Clear existing subPanelContext so it build it fresh everytime
            if( tooltipObject && tooltipObject.subPanelContext ) {
                delete tooltipObject.subPanelContext;
            }

            clearTimeout( showId );

            // if showing in progress, postpone the handle in check timer;
            let cb = () => { hideId = setTimeout( hideInternal, hideDuration ); };
            if( _progress.busy ) {
                utils.tooltipProgressCheck( cb, _progress );
            } else {
                cb();
            }
        };

        let extendedTooltipKeyHandler = ( toShowTooltip ) => {
            if( wcagService.areWeInKeyboardMode() ) {
                let key = wcagService.getKeyName( event );
                if( key !== _kcEsc ) { // escape key should not directly impact tooltip popupRef
                    if( toShowTooltip ) {
                        show( event );
                    } else {
                        hide( event );
                    }
                }
            }
        };

        const keyFocusHandler = () => extendedTooltipKeyHandler( true );
        const keyBlurHandler = () => extendedTooltipKeyHandler( false );

        scope.$on( '$destroy', function() {
            dom.off( target, 'mouseenter', show );
            dom.off( target, 'mouseleave,click', hide );
            dom.off( focusTarget, 'focus', keyFocusHandler );
            dom.off( focusTarget, 'blur', keyBlurHandler );
        } );

        scope.configureTooltip = function() {
            if( rawOptions.isCommand ) {
                target = target.parentNode;
            }
            dom.on( target, 'mouseenter', show );
            dom.on( target, 'mouseleave,click', hide );
            dom.on( focusTarget, 'focus', keyFocusHandler );
            dom.on( focusTarget, 'blur', keyBlurHandler );
        };
        // end
    }
] );

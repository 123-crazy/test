// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceBreadcrumbService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import ctxStateMgmtService from 'js/contextStateMgmtService';
import occmgmtUtils from 'js/occmgmtUtils';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';

import 'js/occurrenceManagementStateHandler';

var exports = {};

export let getContextKeyFromBreadcrumbConfig = function( parentScope ) {
    var scope = parentScope;
    while( !( scope.data && scope.data.breadcrumbConfig ) ) {
        if( scope.$parent ) {
            scope = scope.$parent;
        } else {
            break;
        }
    }
    return scope.data && scope.data.breadcrumbConfig && scope.data.breadcrumbConfig.id ? scope.data.breadcrumbConfig.id : '';
};

/**
 * insertCrumbsFromModelObject
 *
 * @param {IModelObject} modelObject - model object
 * @param {Object} breadCrumbProvider - bread crumb provider
 * @return {Object} bread crumb provider
 */
export let insertCrumbsFromModelObject = function( modelObject, breadCrumbProvider, contextKey ) {
    if( modelObject && modelObject.props && modelObject.props.object_string && breadCrumbProvider ) {
        var props = modelObject.props;
        var crumb = {
            displayName: props.object_string.uiValues[ 0 ],
            showArrow: props.awb0NumberOfChildren ? props.awb0NumberOfChildren.dbValues[ 0 ] > 0 : true,
            selectedCrumb: false,
            scopedUid: modelObject.uid,
            clicked: false
        };

        breadCrumbProvider.crumbs.splice( 0, 0, crumb );

        var parentUid = occmgmtUtils.getParentUid( modelObject );
        if( parentUid ) {
            var parentModelObj = cdm.getObject( parentUid );

            if( parentModelObj ) {
                return exports.insertCrumbsFromModelObject( parentModelObj, breadCrumbProvider, contextKey );
            }
        } else {
            // When the root object is not type of Awb0Element
            if( modelObject.modelType && modelObject.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) === -1 ) {
                var key = contextKey ? contextKey : appCtxSvc.ctx.aceActiveContext.key;
                var openedObject = cdm.getObject( appCtxSvc.ctx[ key ].currentState.uid );
                // And the root object is not the opened object
                if( openedObject !== modelObject ) {
                    // Add the opened object as the first node of the breadcrumb
                    var crumbOpenedObject = {
                        displayName: openedObject.props.object_string.uiValues[ 0 ],
                        showArrow: true,
                        selectedCrumb: false,
                        scopedUid: openedObject.uid,
                        clicked: false
                    };

                    breadCrumbProvider.crumbs.splice( 0, 0, crumbOpenedObject );
                }
            }
        }
    }
    return breadCrumbProvider;
};

/**
 * @param {Object} selectedCrumbUid - selected crumb object uid
 * @param {Object} contextToWorkOn : Context whose breadcrumb is clicked
 * @returns{boolean} if selected object is present in PWA
 */
var isSelectedObjectDisplayedInPWA = function( selectedCrumbUid, contextToWorkOn ) {
    var activeViewModelCollection = contextToWorkOn.vmc;
    var isSelectedCrumbPresentInPWA = false;
    if( activeViewModelCollection ) {
        _.forEach( activeViewModelCollection.loadedVMObjects, function( vmo ) {
            if( vmo && selectedCrumbUid === vmo.uid ) {
                isSelectedCrumbPresentInPWA = true;
            }
        } );
    }
    return isSelectedCrumbPresentInPWA;
};

/**
 * @param {Object} selectedCrumb - selected crumb object
 * @param {String} contextKey - context key
 */
export let onSelectBreadcrumb = function( selectedCrumb, contextKey ) {
    var contextToWorkOn = appCtxSvc.getCtx( contextKey );

    if( isSelectedObjectDisplayedInPWA( selectedCrumb.scopedUid, contextToWorkOn ) ) {
        if( contextToWorkOn.pwaSelectionModel.getCurrentSelectedCount() > 1 || contextToWorkOn.pwaSelectionModel.multiSelectEnabled ) {
            contextToWorkOn.pwaSelectionModel.addToSelection( selectedCrumb.scopedUid );
        } else {
            contextToWorkOn.pwaSelectionModel.setSelection( selectedCrumb.scopedUid );
        }
    } else {
        var newState = {
            o_uid: selectedCrumb.scopedUid,
            c_uid: selectedCrumb.scopedUid
        };
        ctxStateMgmtService.updateContextState( contextKey, newState, true );
    }
};

/**
 * buildNavigateBreadcrumb
 *
 * @param {IModelObject} selectedObjects - selected model objects
 * @return {Object} breadCrumbProvider bread crumb provider
 */
export let buildNavigateBreadcrumb = function( selectedObjects, contextKey ) {
    var modelObject = _.last( selectedObjects );
    if( !modelObject || _.isEmpty( modelObject.props ) ) {
        return;
    }

    var breadCrumbProvider = {};
    breadCrumbProvider.crumbs = [];

    breadCrumbProvider = exports.insertCrumbsFromModelObject( modelObject, breadCrumbProvider, contextKey );

    if( breadCrumbProvider && breadCrumbProvider.crumbs && breadCrumbProvider.crumbs.length > 0 ) {
        breadCrumbProvider.crumbs[ breadCrumbProvider.crumbs.length - 1 ].selectedCrumb = true;
        breadCrumbProvider.crumbs[ 0 ].primaryCrumb = true;
    }

    return breadCrumbProvider;
};

export let updateChevronStateForInactiveView = function( contextKey ) {
    ctxStateMgmtService.updateActiveContext( contextKey );

    _.forEach( appCtxSvc.ctx.splitView.viewKeys, function( viewKey ) {
        if( appCtxSvc.ctx.aceActiveContext.key !== viewKey ) {
            var chevron = viewKey + 'Chevron';
            var chevronObject = appCtxSvc.getCtx( chevron );
            if( chevronObject && chevronObject.selected === false && chevronObject.clicked === true ) {
                chevronObject.clicked = false;
            }
        }
    } );
};

export default exports = {
    getContextKeyFromBreadcrumbConfig,
    insertCrumbsFromModelObject,
    onSelectBreadcrumb,
    buildNavigateBreadcrumb,
    updateChevronStateForInactiveView
};
/**
 * Register this service with AngularJS
 *
 * @memberof NgServices
 * @member aceBreadcrumbService
 */
app.factory( 'aceBreadcrumbService', () => exports );

/**
 * Return this service name as the 'moduleServiceNameToInject' property.
 */

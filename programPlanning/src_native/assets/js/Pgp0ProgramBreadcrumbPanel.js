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
 * @module js/Pgp0ProgramBreadcrumbPanel
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import soa_kernel_clientDataModel from 'soa/kernel/clientDataModel';
import soa_kernel_clientMetaModel from 'soa/kernel/clientMetaModel';
import localeSvc from 'js/localeService';
import _ from 'lodash';

var exports = {};

var breadcrumbList = [];
// selectedPage for maintain the selected Page and PageId
var selectedPage = {};

/**
 * open selected object with location at the time of crumb selection.
 *
 * @param {Object} data - the data object
 * @param {Object} selection - the selected object
 */
var updateUrlOnCrumbSelection = function( data, selection ) {
    //And it should navigate to the correct location
    if( selection ) {
        var selectedcrumb;

        for( var i = 0; i < data.provider.crumbs.length; i++ ) {
            if( data.provider.crumbs[ i ].scopedUid === selection.uid ) {
                selectedcrumb = data.provider.crumbs[ i ];
            }
        }
        if( selectedcrumb && selectedcrumb.scopedUid ) {
            AwStateService.instance.go( '.', {
                uid: selection.uid,
                pageId: selectedcrumb.pageId,
                page: selectedcrumb.page
            } );
        }
        updateCrumb( data, selection );
    }
};

/**
 * populate the BreadCrumb for selected object
 *
 * @param {Object} data - the data object
 * @param {Object} ctx - the ctx object
 */
export let populateProgramBreadCrumb = function( data, ctx, selectedObj ) {
    var element = document.getElementById( 'prgBreadCrumbs' );
    if( element ) {
        element.style.width = '100%';
    }

    var selection = selectedObj;
    var localcrumbs;

    if( !selection ) {
        if( ctx.selected === undefined ) {
            selection = ctx.locationContext.modelObject;
        } else {
            selection = ctx.selected;
        }
    }

    if( !selection ) {
        return;
    }

    // check if Prg0AbsProgramPlan come it will reset the breadcrumbList
    if( soa_kernel_clientMetaModel.isInstanceOf( 'Prg0AbsProgramPlan', selection.modelType ) ) {
        breadcrumbList = [];
    }

    let pageDisplayName = '';
    if(ctx.sublocation && ctx.sublocation.label) {
        pageDisplayName = ctx.sublocation.label;
    }
    if( selectedPage.pageId === undefined || selectedPage.page === undefined ) {
        selectedPage = {
            pageId: ctx.xrtPageContext.primaryXrtPageID,
            page: pageDisplayName
        };
    }

    localcrumbs = {
        clicked: false,
        displayName: selection.props.object_string.uiValues[ 0 ],
        selectedCrumb: true,
        showArrow: true,
        scopedUid: selection.uid
    };

    var isPresent = _.findKey( breadcrumbList, {
        scopedUid: selection.uid
    } );

    if( breadcrumbList.length > 0 && ( isPresent === -1 || isPresent === undefined ) ) {
        if( breadcrumbList.length > 0 ) {
            var displayName;
            // Check if same type of Object (Checklist and Checklist Question) is already present in breadcrumb
            //remove previous object
            var objectToBeCut = soa_kernel_clientDataModel.getObject( breadcrumbList[ breadcrumbList.length - 1 ].scopedUid );

            if( ( selection.modelType.typeHierarchyArray.indexOf( 'Psi0Checklist' ) > -1 || selection.modelType.typeHierarchyArray.indexOf( 'Psi0ChecklistQuestion' ) > -1 ) && selection.type === objectToBeCut.type ) {
                breadcrumbList.splice( breadcrumbList.length - 1, 1 );
            } else {
                // Check for Checklist Question if Question opened from secondary view Question sublocation
                //Then set the Page to Questions(Sublocation) in breadcrumb
                if( selection.modelType.typeHierarchyArray.indexOf( 'Psi0ChecklistQuestion' ) > -1 && ctx.locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Psi0ChecklistQuestion' ) > -1 ) {
                    breadcrumbList[ breadcrumbList.length - 1 ].page = getPgp0LocalizedText( 'checklistQuestionsSublocation' );
                    displayName = breadcrumbList[ breadcrumbList.length - 1 ].displayName + '-' + breadcrumbList[ breadcrumbList.length - 1 ].page;
                } else {
                    breadcrumbList[ breadcrumbList.length - 1 ].page = selectedPage.page;
                    displayName = breadcrumbList[ breadcrumbList.length - 1 ].displayName + '-' + selectedPage.page;
                }
                breadcrumbList[ breadcrumbList.length - 1 ].clicked = false;
                breadcrumbList[ breadcrumbList.length - 1 ].selectedCrumb = false;
                breadcrumbList[ breadcrumbList.length - 1 ].pageId = selectedPage.pageId;

                breadcrumbList[ breadcrumbList.length - 1 ].displayName = displayName;
            }
        }
    }

    breadcrumbList.push( localcrumbs );

    var provider = {
        crumbs: breadcrumbList,
        overflowCrumbList: breadcrumbList,
        onSelect: function( selectedcrumb ) {
            var parentProcess = soa_kernel_clientDataModel.getObject( selectedcrumb.scopedUid );
            updateUrlOnCrumbSelection( data, parentProcess );
        }
    };

    if( data ) {
        data.provider = provider;
        data.provider.crumbs = breadcrumbList;
        updateCrumb( data, selection );
    }
    selectedPage = {};
    // Added check for Checklist and Checklist Question Object (custom sublocation)
    if( ctx.sublocation && _.isObject( ctx.sublocation.label ) ) {
        var page = getPgp0LocalizedText( ctx.sublocation.label.key, ctx.sublocation.label.source );
        selectedPage = {
            pageId: ctx.xrtPageContext.primaryXrtPageID,
            page: page
        };
    } else {
        if(ctx.sublocation){
            pageDisplayName = ctx.sublocation.label;
        }
        selectedPage = {
            pageId: ctx.xrtPageContext.primaryXrtPageID,
            page: pageDisplayName
        };
    }
};

/**
 * Method to return Localize text message
 * @param {*} key - Text to get localized value
 */
var getPgp0LocalizedText = function( key, source ) {
    var resource = 'PrgScheduleManagerMessages';
    if( source ) {
        resource = source.slice( 6 );
    }
    var localeTextBundle = localeSvc.getLoadedText( resource );
    return localeTextBundle[ key ];
};

/**
 * update the crumb as per object change
 *
 * @param {Object} data - the data object
 * @param {Object} selectedObject - the selected object
 */
var updateCrumb = function( data, selectedObject ) {
    if( data && selectedObject && selectedObject.uid ) {
        var keySelectedCrumb = parseInt( _.findKey( data.provider.crumbs, {
            scopedUid: selectedObject.uid
        } ) );

        keySelectedCrumb += 1;
        var remove = data.provider.crumbs.length - keySelectedCrumb;

        data.provider.crumbs.splice( keySelectedCrumb, remove );

        data.provider.crumbs[ data.provider.crumbs.length - 1 ].clicked = false;
        data.provider.crumbs[ data.provider.crumbs.length - 1 ].selectedCrumb = true;
        data.provider.crumbs[ data.provider.crumbs.length - 1 ].displayName = selectedObject.props.object_string.dbValues[ 0 ];
    }
};

export let clearAndReinitPrgBreadcrumb = ( planObj ) => {
    if( soa_kernel_clientMetaModel.isInstanceOf( 'Prg0AbsProgramPlan', planObj.modelType ) ) {
        breadcrumbList = [];
    }
    populateProgramBreadCrumb( null, appCtxService.ctx, planObj );
};

export default exports = {
    populateProgramBreadCrumb,
    clearAndReinitPrgBreadcrumb
};
app.factory( 'Pgp0ProgramBreadcrumbPanel', () => exports );

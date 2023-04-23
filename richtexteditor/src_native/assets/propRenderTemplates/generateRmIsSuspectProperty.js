// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateRmIsSuspectProperty
 * @requires app
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import navigationSvc from 'js/navigationService';
import reqUtils from 'js/requirementsUtils';
import localeSvc from 'js/localeService';
var exports = {};

/**
 * Generates Suspect icon DOM Element for Summary Table Proxy object
 * @param { Object } vmo - ViewModelObject for which Suspect icon is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Suspect icon will be rendered
 */
export let generateIsSuspectFlagRendererFn = function( vmo, containerElem ) {
    var reqDashboardTable = appCtxSvc.getCtx( 'reqDashboardTable' );
    var suspectProp = null;
    var hasSuspect = '0';
    if ( vmo.props && vmo.props['REF(arm0SourceElement,Awb0Element).awb0IsSuspect'] ) {
        suspectProp = vmo.props['REF(arm0SourceElement,Awb0Element).awb0IsSuspect'];
    }
    if ( cmm.isInstanceOf( 'Awb0Element', vmo.modelType ) && vmo.props && vmo.props.awb0IsSuspect) {
        suspectProp = vmo.props.awb0IsSuspect;
    }
    
    if ( suspectProp && suspectProp.dbValues && suspectProp.dbValues.length > 0 ) {
        hasSuspect = suspectProp.dbValues[0];
    }

    if ( cmm.isInstanceOf( 'Arm0SummaryTableProxy', vmo.modelType ) && hasSuspect === 'true' ) {
        _rendersuspectIndicator( containerElem, hasSuspect, vmo );
    }

    if (cmm.isInstanceOf('Awb0Element', vmo.modelType) && hasSuspect) {
        _rendersuspectIndicator(containerElem, hasSuspect, vmo, reqDashboardTable);
    }
};

/**
 * @param { Object } containerElem - The container DOM Element inside which Suspect icon will be rendered
 * @param {String} hasSuspect - 1 or 0
 * @param { Object } vmo - ViewModelObject for which Suspect icon is being rendered
 */
var _rendersuspectIndicator = function( containerElem, hasSuspect, vmo, reqDashboardTable ) {
    var resource = 'RequirementsCommandPanelsMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    var parentDiv = document.createElement( 'div' );
    parentDiv.className = 'aw-requirementsmanager-summaryTableContent';
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirementsmanager-summaryTableIcon aw-aria-border';
    cellImg.title = localTextBundle.reviewSuspectTitle;
    cellImg.alt = localTextBundle.reviewSuspectTitle;
    cellImg.tabIndex = 0;
    var imgSrc = null;
    if ( hasSuspect === 'true' || hasSuspect === '1') {
        imgSrc = app.getBaseUrlPath() + '/image/indicatorSuspectLink16.svg';
        cellImg.src = imgSrc;
        parentDiv.appendChild( cellImg );
        containerElem.appendChild( parentDiv );
        if( !reqDashboardTable ) {
            [ 'click', 'keypress' ].forEach( ( eventType )=>{
                cellImg.addEventListener( eventType, function() {
                    var propName = 'fnd0MyWorkflowTasks';
                    if( vmo.props.arm0UnderlyingObject ) {
                        var obj = cdm.getObject( vmo.props.arm0UnderlyingObject.dbValues[0] );
                        if( obj ) {
                            reqUtils.loadModelObjects( [ obj ], [ propName ] ).then( function() {
                                var reviewSuspect = obj.props.fnd0MyWorkflowTasks;
                                if( reviewSuspect && reviewSuspect.dbValues[0] ) {
                                    var action = { actionType: 'Navigate' };
                                    action.navigateTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
                                    action.navigationParams = { uid : reviewSuspect.dbValues[0] };
                                    action.navigateIn = 'newTab';
                                    navigationSvc.navigate( action, action.navigationParams );
                                }
                            } );
                        }
                    }
                } );
            } );
        }
    }
};

export default exports = {
    generateIsSuspectFlagRendererFn
};
app.factory( 'generateRmIsSuspectProperty', () => exports );

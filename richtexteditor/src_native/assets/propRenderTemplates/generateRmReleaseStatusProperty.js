// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Module for the Requirement wide panel page that
 * generate release_status_list Property and attaching image and event listener to it
 *
 * @module propRenderTemplates/generateRmReleaseStatusProperty
 * @requires app
 */
import app from 'app';
import localeSvc from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';
import navigationSvc from 'js/navigationService';
var exports = {};

/**
 * generate release_status_list Property and attaching image and event listener to it
 * @param { Object } vmo - ViewModelObject of Summary Tab or dashboard
 * @param { Object } containerElem - The container DOM Element inside which image will rendered
 */
export let generateRmReleaseStatusIconRendererFn = function( vmo, containerElem ) {
    var releaseStatus = null;
    if( vmo.props && vmo.props[ 'REF(awb0UnderlyingObject,WorkspaceObject).release_status_list' ] ) {
        releaseStatus = vmo.props[ 'REF(awb0UnderlyingObject,WorkspaceObject).release_status_list' ];
    } else if( vmo.props && vmo.props[ 'REF(arm0UnderlyingObject,ItemRevision).release_status_list' ] ) {
        releaseStatus = vmo.props[ 'REF(arm0UnderlyingObject,ItemRevision).release_status_list' ];
    }
    if( releaseStatus && releaseStatus.dbValues && releaseStatus.dbValues.length > 0 ) {
        _renderReleaseStatusIcon( containerElem, releaseStatus );
    }
};

/**
 * @param { Object } containerElem -  The container DOM Element inside which image will rendered
 * @param {String} releaseStatus - releaseStatus
 */
var _renderReleaseStatusIcon = function( containerElem, releaseStatus ) {
    if( releaseStatus.dbValues ) {
        var parentDiv = document.createElement( 'div' );
        parentDiv.className = 'aw-splm-tableCellText';
        var imgSrc;

        for( let index = 0; index < releaseStatus.dbValues.length; index++ ) {
            var modelObject = cdm.getObject( releaseStatus.dbValues[index] );
            var status = modelObject.props.object_name.dbValues[0];
            if( status === 'TC Baselined' || status === 'Baseline' ) {
                imgSrc = app.getBaseUrlPath() + '/image/indicatorReleasedTCBaselined16.svg';
                _renderReleaseStatusIconAndAttachEvent( index, imgSrc, releaseStatus, parentDiv );
            }
            if( status === 'TCM Released' ) {
                imgSrc = app.getBaseUrlPath() + '/image/indicatorReleasedTCMReleased16.svg';
                _renderReleaseStatusIconAndAttachEvent( index, imgSrc, releaseStatus, parentDiv );
            }
            if( status === 'Draft' ) {
                imgSrc = app.getBaseUrlPath() + '/image/indicatorDraft16.svg';
                _renderReleaseStatusIconAndAttachEvent( index, imgSrc, releaseStatus, parentDiv );
            }
            if( status === 'In Review' ) {
                imgSrc = app.getBaseUrlPath() + '/image/indicatorReadOnly16.svg';
                _renderReleaseStatusIconAndAttachEvent( index, imgSrc, releaseStatus, parentDiv );
            }
            if( status === 'Rejected' ) {
                imgSrc = app.getBaseUrlPath() + '/image/indicatorReleasedRejected16.svg';
                _renderReleaseStatusIconAndAttachEvent( index, imgSrc, releaseStatus, parentDiv );
            }
        }
        containerElem.appendChild( parentDiv );
    }
};

/**
 * @param { index } index - index of releaseStatus object
 * @param { Object } imgSrc -  image source
 * @param {Object} releaseStatus - releaseStatus
 * @param {HTMLElement} parentDiv - Parent Div
 */
var _renderReleaseStatusIconAndAttachEvent = function( index, imgSrc, releaseStatus, parentDiv ) {
    var cellImg1 = document.createElement( 'img' );
    cellImg1.className = 'aw-visual-indicator aw-commands-command aw-requirementsmanager-summaryTableIcon';
    cellImg1.title = releaseStatus.displayValues[ index ];
    cellImg1.setAttribute( 'objectUid', releaseStatus.dbValues[ index ] );
    cellImg1.src = imgSrc;
    parentDiv.appendChild( cellImg1 );
    [ 'click', 'keypress' ].forEach( ( eventType ) => {
        cellImg1.addEventListener( eventType, function() {
            var objectUid = cellImg1.getAttribute( 'objectUid' );
            var modelObject = cdm.getObject( objectUid );
            var action = { actionType: 'Navigate' };
            action.navigateTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
            action.navigationParams = { uid: modelObject.uid };
            navigationSvc.navigate( action, action.navigationParams );
        } );
    } );
};

export default exports = {
    generateRmReleaseStatusIconRendererFn
};
app.factory( 'generateRmReleaseStatusProperty', () => exports );

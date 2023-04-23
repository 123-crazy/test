// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateTracelinkProperty
 * @requires app
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import arm0CreateTraceLink from 'js/Arm0CreateTraceLink';
import arm0ExistingTraceLink from 'js/Arm0ExistingTraceLink';
import cmm from 'soa/kernel/clientMetaModel';
import localeSvc from 'js/localeService';
var exports = {};

/**
 * Generates Tracelink DOM Element for Awb0Element or Summary Table Proxy object
 * @param { Object } vmo - ViewModelObject for which Tracelink is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Tracelink will be rendered
 */
export let generateAwb0TraceLinkFlagRendererFn = function( vmo, containerElem ) {
    var reqDashboardTable = appCtxSvc.getCtx( 'reqDashboardTable' );
    if ( cmm.isInstanceOf( 'Awb0Element', vmo.modelType ) && vmo.props && vmo.props.awb0TraceLinkFlag ) {
        var has_trace_link = vmo.props.awb0TraceLinkFlag.dbValues[0];

        if( reqDashboardTable ) {
            if( has_trace_link !== '0' ) {
                _renderTracelinkIndicator( vmo, containerElem, has_trace_link, reqDashboardTable );
            }
        } else {
            _renderTracelinkIndicator( vmo, containerElem, has_trace_link );
        }
    }
};

/**
 * @param { Object } vmo - ViewModelObject for which Tracelink is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Tracelink will be rendered
 * @param {String} hasTracelinkflag - 1 or 0
 */
var _renderTracelinkIndicator = function( vmo, containerElem, hasTracelinkflag, reqDashboardTable ) {
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator aw-requirementsmanager-summaryTableIcon';

    var resource = 'RequirementsCommandPanelsMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );

    cellImg.title = localTextBundle.createTraceLinkTitle;
    var imgSrc = null;
    if ( hasTracelinkflag === '1' || hasTracelinkflag === '2' ) {
        imgSrc = app.getBaseUrlPath() + '/image/indicatorTraceLink16.svg';
    } else {
        imgSrc = app.getBaseUrlPath() + '/image/cmdCreateTraceLink24.svg';
    }
    var objectUid = vmo.uid;
    if ( vmo.type === 'Arm0SummaryTableProxy' && vmo.props.arm0SourceElement ) {
        objectUid = vmo.props.arm0SourceElement.dbValues[0];
    }
    if( !reqDashboardTable ) {
        // Add click event to open the Tracelink panel
        cellImg.addEventListener( 'click', function() {
            var eventData = {
                sourceObject: {
                    uid: objectUid
                }
            };
            if ( arm0CreateTraceLink ) {
                arm0CreateTraceLink.addObjectToTracelinkPanel( eventData );
            }
        }, objectUid );
    }

    cellImg.src = imgSrc;
    containerElem.appendChild( cellImg );
};

/**
 * Generates tracelink icon DOM Element for Summary Table Proxy object
 * @param { Object } vmo - ViewModelObject for which tracelink icon is being rendered
 * @param { Object } containerElem - The container DOM Element inside which tracelink icon will be rendered
 */
export let generateRmTracelinkCountRendererFn = function( vmo, containerElem ) {
    var tracelinkProp = null;
    var tracelinkCount = '0';
    if ( vmo.props && vmo.props.arm0TracelinkCount ) {
        tracelinkProp = vmo.props.arm0TracelinkCount;
    }
    if ( tracelinkProp && tracelinkProp.dbValues && tracelinkProp.dbValues.length > 0 ) {
        tracelinkCount = tracelinkProp.dbValues[0];
    }

    var objectUid = vmo.uid;
    if ( vmo.modelType.name === 'Arm0SummaryTableProxy' && vmo.props.arm0SourceElement ) {
        objectUid = vmo.props.arm0SourceElement.dbValues[0];
    }
    _renderTracelinkCountIndicator( objectUid, containerElem, parseInt( tracelinkCount ) );
};

/**
 * @param {String} objectUid - object uid
 * @param { Object } containerElem - The container DOM Element inside which tracelink icon will be rendered
 * @param {String} tracelinkCount - the number of tracelinks that exist
 */
var _renderTracelinkCountIndicator = function( objectUid, containerElem, tracelinkCount ) {
    var resource = 'RequirementsCommandPanelsMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    var parentDiv = document.createElement( 'div' );
    parentDiv.className = 'aw-requirementsmanager-summaryTableContent';
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirementsmanager-summaryTableIcon aw-aria-border';
    cellImg.title = localTextBundle.createTraceLinkTitle;
    cellImg.alt = localTextBundle.createTraceLinkTitle;
    cellImg.tabIndex = 0;
    var imgSrc = null;
    if ( tracelinkCount && tracelinkCount > 0 ) {
        imgSrc = app.getBaseUrlPath() + '/image/indicatorTraceLink16.svg';
        var textDiv = document.createElement( 'span' );
        textDiv.innerText = tracelinkCount;
        textDiv.className = 'aw-aria-border';
        textDiv.setAttribute( 'style', 'cursor:pointer;' );
        textDiv.tabIndex = 0;

        [ 'click', 'keypress' ].forEach( ( eventType ) => {
            textDiv.addEventListener( eventType, function() {
                const popupParams = {
                    declView: 'Arm0ExistingTraceLinkTreePopup',
                    locals: {
                        anchor: 'arm0_existing_tl_popup',
                        caption: localTextBundle.existingTraceLinkLabel
                    },
                    options: {
                        reference: '.aw-layout-infoCommandbar',
                        isModal: false,
                        placement: 'left-end',
                        width: 600,
                        height: 800,
                        draggable: true,
                        detachMode: true,
                        disableClose: true
                    }
                };
                if ( arm0ExistingTraceLink ) {
                    arm0ExistingTraceLink.activateExistingTraceLinkPanel( popupParams, true );
                }
            } );
        } );
        parentDiv.appendChild( textDiv );
    } else {
        imgSrc = app.getBaseUrlPath() + '/image/cmdCreateTraceLink24.svg';
    }

    // Add click & keypress event to open the Tracelink panel
    [ 'click', 'keypress' ].forEach( ( eventType ) => {
        cellImg.addEventListener( eventType, function() {
            var eventData = {
                sourceObject: {
                    uid: objectUid
                }
            };
            if ( arm0CreateTraceLink ) {
                arm0CreateTraceLink.addObjectToTracelinkPanel( eventData );
            }
        }, objectUid );
    } );

    cellImg.src = imgSrc;
    parentDiv.appendChild( cellImg );
    containerElem.appendChild( parentDiv );
};

export default exports = {
    generateRmTracelinkCountRendererFn,
    generateAwb0TraceLinkFlagRendererFn
};
app.factory( 'generateTracelinkProperty', () => exports );

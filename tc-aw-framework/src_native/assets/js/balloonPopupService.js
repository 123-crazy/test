// Copyright (c) 2020 Siemens

/**
 *
 * This service is used for adding balloon popup to aw-commands in aw-command-bar and aw-command-panel.
 *
 * @module js/balloonPopupService
 *
 * @publishedApolloService
 */
import app from 'app';
import AwRootScopeService from 'js/awRootScopeService';
import logger from 'js/logger';
import 'js/aw-balloon-popup-panel.directive';
import popupService from 'js/popupService';

var exports = {};

const BALLOON_POPUP_SUFFIX = 'BalloonPopup';
const EXTENDED_TOOLTIP_SUFFIX = 'ExtendedTooltip';

// adaptor to map old options to our unified popup options
const hash = { center: '', left: 'start', right: 'end', top: 'start', bottom: 'end' };
let adaptor = ( popupOrientation ) => {
    let old = popupOrientation.toLowerCase();
    let [ base, shift ] = old.split( '_' );
    let shift_new = shift.replace( /center|left|right|bottom|top/g, matched => hash[ matched ] );
    let placement = base;
    if( shift_new ) { placement = `${base}-${shift_new}`; }
    return placement;
};

/**
 * @deprecated afx@3.2.0, use `popupService.show` instead
 * @alternative popupService.show
 * @obsoleteIn afx@4.3.0
 *
 * Typically, this service would be used inside an action in ViewModel json to set the attributes of the balloon-popup before opening it.
 * For example:
 * ===========
 *         "<Action-Name-That-Trigger-Balloon-Popup>": {
 *            "actionType": "JSFunction",
 *            "method": "openBalloonPopup",
 *            "inputData": {
 *                "view": "buttonBalloonPopup",
 *                "popuporientation": "BOTTOM_CENTER",
 *                "popupheight": "200px",
 *                "popupwidth": "500px",
 *                "popupclosebutton": "false",
 *                "popupMinHeight": "50px",
 *                "popupMinWidth": "100px"
 *            },
 *            "deps": "js/balloonPopupService"
 *         }
 *
 * @param {String} view - html view of popup
 * @param {String} elementDimension - selected element dimension
 * @param {String} popupOrientation - orientation of popup
 * e.g. BOTTOM_RIGHT, BOTTOM_CENTER, BOTTOM_LEFT, TOP_RIGHT, TOP_CENTER, TOP_LEFT, RIGHT_TOP, RIGHT_CENTER, RIGHT_BOTTOM, LEFT_TOP, LEFT_CENTER, LEFT_BOTTOM
 * @param {String} popupHeight - height of popup in px
 * @param {String} popupWidth - width of popup in px
 * @param {String} popupCloseButton - String with Boolean Value to control visibility of close button for popup
 */
export let openBalloonPopup = function( view, elementDimension, popupOrientation, popupHeight,
    popupWidth, popupCloseButton, popupMinHeight, popupMinWidth, extendedTooltipContent, whenOpenedCallback ) {
    let context = AwRootScopeService.instance.$new();
    let hasCloseButton = popupCloseButton === true || popupCloseButton === 'true';
    let placement = adaptor( popupOrientation );
    logger.info( placement );

    let width = parseInt( popupWidth );
    let height = parseInt( popupHeight );

    let reference = elementDimension.elementObject;
    if( !reference ) {
        // adaptive backwards
        reference = {
            mock: true,
            ownerDocument: {
                documentElement: { clientTop: 0, clientLeft: 0 }
            },
            setAttribute: () => {
                //
            },
            getAttribute: () => {
                //
            },
            getBoundingClientRect: () => {
                return {
                    left: elementDimension.offsetLeft,
                    top: elementDimension.offsetTop,
                    width: elementDimension.offsetWidth,
                    height: elementDimension.offsetHeight,
                    right: elementDimension.offsetLeft + elementDimension.offsetWidth,
                    bottom: elementDimension.offsetTop + elementDimension.offsetHeight
                };
            }
        };
    }
    //for balloon popup
    let template = '<aw-balloon-popup-panel><div class="aw-base-scrollPanel"> <aw-include name="' + view + '"></aw-include></div></aw-balloon-popup-panel>';
    return popupService.show( {
        template,
        context,
        locals: {
            hasCloseButton
        },
        options: {
            reference,
            placement,
            flipBehavior: 'opposite',
            width,
            height
        }
    } );
};

/**
 * @deprecated afx@3.2.0, entire functionality available in `popupService` in a declarative way.
 * @alternative No Alternative
 * @obsoleteIn afx@4.3.0
 */
export let getBalloonPopupID = function( elementDimension, view ) {
    var popupId;
    var suffix = BALLOON_POPUP_SUFFIX;
    if( elementDimension.popupType === 'extendedTooltip' ) {
        suffix = EXTENDED_TOOLTIP_SUFFIX;
    }

    if( elementDimension.popupId === undefined ) {
        popupId = view + suffix;
    } else {
        // we can also provide ID for balloon popup using element Dimension
        // if popupId present in element Dimension , then use this ID for balloon popup
        popupId = elementDimension.popupId + suffix;
    }
    return popupId;
};

/**
 * @deprecated afx@3.2.0, entire functionality available in `popupService` in a declarative way.
 * @alternative No Alternative
 * @obsoleteIn afx@4.3.0
 */
// Determine wether the tooltip popup is overlap with reference element
export let isTooltipOverlapWithRefElement = function( refElement, tooltipPopupElem ) {
    var overlap = false;
    if( !refElement || !tooltipPopupElem ) {
        return overlap;
    }

    var popupElem = tooltipPopupElem.find( '.aw-layout-popup' );
    if( popupElem.length > 0 ) {
        var popupRect = popupElem[ 0 ].getBoundingClientRect();
        var refElemRect = refElement[ 0 ].getBoundingClientRect();
        var boundingBox = {
            width: Math.max( popupRect.right, refElemRect.right ) - Math.min( popupRect.left, refElemRect.left ),
            height: Math.max( popupRect.bottom, refElemRect.bottom ) - Math.min( popupRect.top, refElemRect.top )
        };

        overlap = boundingBox.width < popupRect.width + refElemRect.width && boundingBox.height < popupRect.height + refElemRect.height;
    }

    return overlap;
};

exports = {
    openBalloonPopup,
    getBalloonPopupID,
    isTooltipOverlapWithRefElement
};
export default exports;

/**
 * Service to manage balloon popup
 *
 * @memberOf NgServices
 * @returns {balloonPopupService} Reference to service API Object.
 */
app.factory( 'balloonPopupService', () => exports );

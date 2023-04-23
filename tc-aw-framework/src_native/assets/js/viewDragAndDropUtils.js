// Copyright (c) 2020 Siemens

/**
 * @module js/viewDragAndDropUtils
 */

import _ from 'lodash';
import domUtils from 'js/domUtils';
import eventBus from 'js/eventBus';
import declDragAndDropService from 'js/declDragAndDropService';

const dom = domUtils.DOMAPIs;

let exports = {};

const highlightView = ( eventData ) => {
    const isViewElement = ( element ) => {
        return element.nodeName.toLowerCase() === 'aw-include' && element.classList.contains( 'aw-widgets-droppable' );
    };

    if( !_.isUndefined( eventData ) && !_.isUndefined( eventData.targetElement ) && isViewElement( eventData.targetElement ) ) {
        var isHighlightFlag = eventData.isHighlightFlag;
        var target = eventData.targetElement;
        if( isHighlightFlag ) {
            target.classList.add( 'aw-widgets-dropframe' );
            target.classList.add( 'aw-theme-dropframe' );
        } else {
            target.classList.remove( 'aw-theme-dropframe' );
            target.classList.remove( 'aw-widgets-dropframe' );
        }
    }
};

const callBackAPIs = {
    highlightTarget: highlightView,
    getTargetElementAndVmo: ( event ) => {
        let target = dom.closest( event.target, 'aw-include.aw-widgets-droppable' );
        return {
            targetElement: target,
            targetVMO: null
        };
    }
};

export const setupDragAndDropOnView = function( viewElement, declViewModel ) {
    const hasDrophandlers = declDragAndDropService.setupDragAndDropOnView( viewElement, callBackAPIs, declViewModel );
    if( hasDrophandlers ) {
        return eventBus.subscribe( 'dragDropEvent.highlight', highlightView );
    }
    return null;
};

exports = {
    setupDragAndDropOnView
};

export default exports;

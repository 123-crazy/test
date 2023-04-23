// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwygModeService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import declUtils from 'js/declUtils';

var exports = {};

var findWysiwygMode = function( datactxNode ) {
    if( !datactxNode.$parent && datactxNode.data ) {
        var declViewModel = declUtils.findViewModel( datactxNode );
        datactxNode = declViewModel._internal.origCtxNode;
    }

    while( datactxNode && !datactxNode.isWysiwygMode ) {
        datactxNode = datactxNode.$parent;
    }
    return datactxNode && datactxNode.isWysiwygMode;
};

export let isWysiwygMode = function( datactxNode ) {
    var isWysiwygMode = false;
    var state = appCtxService.getCtx( 'wysiwyg.state' );
    if( state && ( state.current.name === 'wysiwygCanvas' || state.current.name === 'wysiwygPreview' ) ) {
        if( datactxNode ) {
            isWysiwygMode = findWysiwygMode( datactxNode );
        }
    }
    return isWysiwygMode;
};

exports = {
    isWysiwygMode
};
export default exports;
app.factory( 'wysModeSvc', () => exports );

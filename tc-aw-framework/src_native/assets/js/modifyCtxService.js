// Copyright (c) 2020 Siemens

/**
 * This service provides a template action method to register/unregister/update/updatePartial context variables used to hold application state.
 *
 * @module js/modifyCtxService
 *
 * @publishedApolloService
 */
import appCtxSvc from 'js/appCtxService';

let exports = {};

/**
 * template action method to register/unregister/update/updatePartial context
 *
 * @param {String} methodType - The type of action method
 * @param {String} name - The name of context variable
 * @param {Object} value - The value of context variable
 * @param {String} path - Path to the context

 */
export let modifyCtx = function( methodType, name, value, path ) {
    //switch to different method base on action type
    switch ( methodType ) {
        case 'register':
            appCtxSvc.registerCtx( name, value );
            break;
        // remove unRegister since it break some UI work in closePanel Event
        case 'update':
            appCtxSvc.updateCtx( name, value );
            break;
        case 'updatePartial':
            appCtxSvc.updatePartialCtx( path, value );
            break;
    }
};

exports = {
    modifyCtx
};
export default exports;

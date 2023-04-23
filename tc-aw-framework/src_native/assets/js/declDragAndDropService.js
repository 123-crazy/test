// Copyright (c) 2020 Siemens

/**
 * This service is responsible to process drag and drop handlers on the declViewModel if drag and
 * drop configuration is defined for that particular view.
 * It is also responsible to attach the drag and drop listners to applicable views and widgets.
 *
 * @module js/declDragAndDropService
 */

import 'config/dragAndDrop';
import cfgSvc from 'js/configurationService';
import declUtils from 'js/declUtils';
import _ from 'lodash';
import actionService from 'js/actionService';
import appCtxSvc from 'js/appCtxService';
import conditionSvc from 'js/conditionService';
import logger from 'js/logger';
import awConfiguration from 'js/awConfiguration';

let exports;

const PRE_LOADED_DEPS = '_internal.preLoadedDeps';
const DRAG_HANDLERS = '_internal.dragHandlers';
const DROP_HANDLERS = '_internal.dropHandlers';

let defaultDragHandler = null;
let defaultDropHandler = null;
let dragDropConfig = null;
let viewHandlersMap = new Map();

const loadConfiguration = () => {
    /*
    * Get the drag and drop configuration
    */
    dragDropConfig = cfgSvc.getCfgCached( 'dragAndDrop' );
    let defaultDragAndDropConfig = awConfiguration.get( 'defaultDragAndDropHandlers' );
    if( defaultDragAndDropConfig !== '{{defaultDragAndDropHandlers}}' ) {
        defaultDragHandler = defaultDragAndDropConfig.dragHandler !== '' ? defaultDragAndDropConfig.dragHandler : null;
        defaultDropHandler = defaultDragAndDropConfig.dropHandler !== '' ? defaultDragAndDropConfig.dropHandler : null;
    }
};

const createDragAndDropHandlersMap = () => {
    const setViewHandlers = ( viewName, handlerDef, handlerkey ) => {
        let key = handlerkey === 'dragActions' ? 'dragHandlers' : 'dropHandlers';

        if( !viewHandlersMap.has( viewName ) ) {
            viewHandlersMap.set( viewName, {
                dragHandlers: [],
                dropHandlers: []
            } );
        }
        let def = viewHandlersMap.get( viewName );

        let viewHandlerDef = {
            condition: {},
            handlers: handlerDef[ handlerkey ]
        };
        if( handlerDef.activeWhen ) {
            viewHandlerDef.condition.activeWhen = handlerDef.activeWhen;
        }
        def[ key ].push( viewHandlerDef );
    };

    const processHandlers = ( handlers, handlerkey ) => {
        _.forEach( handlers, ( handlerDef, handlerName ) => {
            if( handlerName === defaultDragHandler || handlerName === defaultDropHandler ) {
                return;
            }
            _.forEach( handlerDef.views, ( viewName ) => {
                setViewHandlers( viewName, handlerDef, handlerkey );
            } );
        } );
    };
    if( dragDropConfig ) {
        let handlers = dragDropConfig.dragHandlers;
        processHandlers( handlers, 'dragActions' );
        handlers = dragDropConfig.dropHandlers;
        processHandlers( handlers, 'dropActions' );
    }
};

const getTargetEleAndVMOs = ( event, callbackAPIs ) => {
    let target = {};
    let isSourceEle = event.type === 'dragstart';
    if( callbackAPIs.getTargetElementAndVmo ) {
        target = callbackAPIs.getTargetElementAndVmo( event, isSourceEle );
    }
    return {
        targetElement: target.targetElement,
        targetObjects: target.targetVMO
    };
};

const getAction = ( declViewModel, actionName ) => {
    const dragAndDropInput = '{{dragAndDropParams}}';
    let action = _.get( declViewModel, '_internal.actions.' + actionName );

    if( action ) {
        //adding actionId ref to action object for consistency with declViewModel actions
        action.actionId = actionName;
        if( !action.inputData ) {
            _.set( action, 'inputData', { dndParams: dragAndDropInput } );
        } else {
            let inputData = { ...action.inputData, dndParams: dragAndDropInput };
            _.set( action, 'inputData', inputData );
        }
        return action;
    }
    return null;
};

const evaluateActiveWhen = ( handlerObj, dragAndDropConfig, declViewModel ) => {
    if( handlerObj.condition ) {
        handlerObj = handlerObj.condition;
    }
    if( !handlerObj.activeWhen ) {
        return true;
    }

    let data = { ...declViewModel };
    if( data.dataProviders && Object.keys( data.dataProviders ).length === 0 ) {
        data.dataProviders = null;
    }
    return conditionSvc.evaluateConditionExpression( handlerObj, { data: data, ctx: appCtxSvc.ctx }, { clauseName: 'activeWhen', conditionList:dragAndDropConfig } );
};

/*
 * Attaching dragenter, dragover and drop listners at the document level
 * These listners are mainly required for file drag and drop. Whenever a file is dragged from Os to the browser, by
 * default the effectAllowed property that is set by OS(defaults to copy/move depending on the file type) will be set
 * as the dropEffect.
 * So as soon as the file is dragged on browser, the default dropEffect would be enabled(copy/move) and thus drop is enabled
 * if the no events listners for drag and drop are defined for the particular part of the page. Further the default browser behavior
 * to open the dropped file would be performed.
 *
 * These listners basically set the drop effect to false during dragenter and dragover phase, thus preventing drop.
 *
 * Note: A file specific check is not added during dragenter and dragover phase as doing so would lead to undefined dropEffect
 * state(instead of block) for objects that are being dragged on non-droppable drop areas.
 */
const attachDocEventListners = () => {
    const setDropEffect = ( event ) => {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'none';
    };
    document.addEventListener( 'dragover', setDropEffect );
    document.addEventListener( 'dragenter', setDropEffect );
    document.addEventListener( 'drop', setDropEffect );
};

const setDragAndDropHandlersOnVM = ( declVm, path, activeHandlerActions, actionsDefs ) => {
    const getDeps = async( depsToPreLoad ) => {
        let dependenciesToPreload = {};
        let depTobBeLoaded = [];

        depsToPreLoad.forEach( ( depToLoad ) => {
            if( dependenciesToPreload[ depToLoad ] ) {
                return;
            }
            var depModuleObj = declUtils.getDependentModule( depToLoad );
            if( depModuleObj ) {
                dependenciesToPreload[ depToLoad ] = depModuleObj;
            } else {
                depTobBeLoaded.push( depToLoad );
            }
        } );

        if( depTobBeLoaded.length ) {
            let depModuleObjs = await declUtils.loadDependentModules( depTobBeLoaded );
            if( depModuleObjs ) {
                _.forEach( depModuleObjs, ( value, key ) => {
                    dependenciesToPreload[ 'js/' + key ] = value;
                } );
            }
        }
        return dependenciesToPreload;
    };

    const setDnDActionsOnVM = ( declVm, handlerActions ) => {
        let declVmActions = _.get( declVm, '_internal.actions' );
        if( !declVmActions ) {
            _.set( declVm, '_internal.actions', handlerActions );
        } else {
            Object.assign( declVmActions, handlerActions );
        }
    };

    const getHandlerActionsAndDepsToLoad = ( activeHandlerActions ) => {
        let depsToLoad = [];
        let handlerActions = {};
        _.forEach( activeHandlerActions, ( actionName ) => {
            let actionDef = actionsDefs[ actionName ];
            if( !actionDef ) {
                return;
            }
            handlerActions[ actionName ] = actionDef;
            let found = depsToLoad.some( ( dep ) => dep === actionDef.deps );
            if( !found ) {
                depsToLoad.push( actionDef.deps );
            }
        } );
        return {
            handlerActions,
            depsToLoad
        };
    };

    const setPreLoadedDepsOnVM = ( declVm, deps ) => {
        let loadedDeps = _.get( declVm, PRE_LOADED_DEPS );
        if( !loadedDeps ) {
            _.set( declVm, PRE_LOADED_DEPS, deps );
        } else {
            Object.assign( declVm._internal.preLoadedDeps, deps );
        }
    };

    //Set drag and drop handler references on the declViewModel
    //These handler references will be used by widgets to setup drag and drop
    _.set( declVm, path, activeHandlerActions );

    let handlers = getHandlerActionsAndDepsToLoad( activeHandlerActions );
    setDnDActionsOnVM( declVm, handlers.handlerActions );
    getDeps( handlers.depsToLoad ).then( ( deps ) => {
        setPreLoadedDepsOnVM( declVm, deps );
    } );
};

const processDnDEvent = ( data, event ) => {
    if( data.effectAllowed ) {
        event.dataTransfer.effectAllowed = data.effectAllowed;
    }

    if( data.dropEffect ) {
        event.dataTransfer.dropEffect = data.dropEffect;
    }

    if( data.preventDefault ) {
        event.preventDefault();
    }

    if( data.stopPropagation ) {
        event.stopPropagation();
    }

    if( !_.isEmpty( data.setDragImage ) ) {
        event.dataTransfer.setDragImage( data.setDragImage.dragImage, data.setDragImage.xOffest, data.setDragImage.yOffest );
    }
};

export const areDnDHandelersDefined = function( declViewModel ) {
    let dragProviders = _.get( declViewModel, DRAG_HANDLERS );
    let dropProviders = _.get( declViewModel, DROP_HANDLERS );
    return dragProviders || dropProviders;
};

/**
 * Setup drag and drop listners on the element if drag and drophandlers are defined on the declViewModel
 * @param {Element} element: The DOM element on which the drag and drop listeners are to be attached.
 *
 * @param {Object} callbackAPIs:Callback functions used for various reasons of interaction with the
 *            container(element).
 *
 * @param {Object} declViewModel: The declarative viewmodel object of the corresponding to the element
 *
 * @param {Object} dataProvider: The dataProvider associated with the widget(if applicable)
 */
export const setupDragAndDrop = function( element, callbackAPIs, declViewModel, dataProvider ) {
    let dragProviders = _.get( declViewModel, DRAG_HANDLERS );
    let dropProviders = _.get( declViewModel, DROP_HANDLERS );

    const processDnDParamsAndGetCtxNode = ( declViewModel, event, target, callbackAPIs, dataProvider ) => {
        let dataCtxNode = _.get( declViewModel, '_internal.origCtxNode' );
        if( !dataCtxNode ) {
            dataCtxNode = {};
        }
        dataCtxNode.dragAndDropParams = {
            event: event,
            targetElement: target.targetElement,
            targetObjects: target.targetObjects,
            declViewModel,
            callbackAPIs,
            dataProvider
        };
        return dataCtxNode;
    };

    const executeHandler = ( declViewModel, handlerAction, dataCtxNode, event ) => {
        let action = getAction( declViewModel, handlerAction );
        if( !action ) {
            logger.error( 'Missing action definition for ' + handlerAction );
            return;
        }
        let depModuleObj = _.get( declViewModel, PRE_LOADED_DEPS );
        let retData = actionService.performActionSync( declViewModel, action, dataCtxNode, depModuleObj[ action.deps ] );
        if( retData ) {
            processDnDEvent( retData, event );
        }
    };

    const getEventCallbackFn = ( handlerAction, event ) => {
        let target = getTargetEleAndVMOs( event, callbackAPIs );
        //Do not stop event propagation for views.
        // This is required for global highlight usecases( highlight drop areas on the page if not on a widget )
        //If needed consumers can handler it explicitly in their handlers
        if( target.targetElement && target.targetElement.nodeName.toLowerCase() !== 'aw-include' ) {
            event.stopPropagation();
        }
        //setting a flag on declVM indicate that a that an element from it is being dragged
        //This is mainly required to prevent selection of a list cell the list when it is dragged
        if( event.type === 'dragstart' ) {
            declViewModel._swDragging = true;
        }
        if( ( event.type === 'dragend' || event.type === 'drop' ) && declViewModel._swDragging ) {
            delete declViewModel._swDragging;
        }

        let dataCtxNode = processDnDParamsAndGetCtxNode( declViewModel, event, target, callbackAPIs, dataProvider );
        executeHandler( declViewModel, handlerAction, dataCtxNode, event );
    };

    const setListener = ( eventType, handlerAction ) => {
        let callBackFn = getEventCallbackFn.bind( null, handlerAction );
        element.addEventListener( eventType, callBackFn );
    };

    const setEventListener = ( providers ) => {
        Object.keys( providers ).forEach( ( providerName ) => {
            setListener( providerName.toLowerCase(), providers[ providerName ] );
        } );
    };

    if( dragProviders ) {
        setEventListener( dragProviders );
    }

    if( dropProviders ) {
        setEventListener( dropProviders );
    }
};

/**
 * Process the active drag and drop handlers on the declViewModel, if any. Also sets up the drag and drop
 * listners of the view element if active drop handler is found.
 *
 * @param {Element} element: The DOM element on which the drag and drop listeners are to be attached.
 *
 * @param {Object} callbackAPIs:Callback functions used for various reasons of interaction with the
 *            container(element).
 *
 * @param {Object} declViewModel: The declarative viewmodel object of the corresponding to the element
 *
 * @returns {Boolean} Returns whether or not active drop handler is defined for the view.
 */
export const setupDragAndDropOnView = function( element, callbackAPIs, declViewModel ) {
    let activeHandler = null;

    if( !dragDropConfig ) {
        return false;
    }
    let currentViewName = _.get( declViewModel, '_internal.viewId' );
    const isHandlerActiveForView = ( viewName, handlerType ) => {
        let handlers = viewHandlersMap.get( viewName );
        if( handlers && handlers[ handlerType ].length ) {
            return handlers[ handlerType ].some( ( handlerObj ) => {
                if( evaluateActiveWhen( handlerObj, dragDropConfig, declViewModel ) ) {
                    activeHandler = handlerObj;
                    return true;
                }
                return false;
            } );
        }
        return false;
    };

    const attachDefaultHandler = ( handlerPath, handlerName, handlerActionKey ) => {
        let handler = _.get( dragDropConfig, handlerName );
        if( handler && handler.views[ 0 ] === '*' && evaluateActiveWhen( handler, dragDropConfig, declViewModel ) ) {
            setDragAndDropHandlersOnVM( declViewModel, handlerPath, handler[ handlerActionKey ], dragDropConfig.actions );
        }
    };

    let isDragHandlerActive = isHandlerActiveForView( currentViewName, 'dragHandlers' );
    if( isDragHandlerActive && activeHandler ) {
        setDragAndDropHandlersOnVM( declViewModel, DRAG_HANDLERS, activeHandler.handlers, dragDropConfig.actions );
    } else if( !isDragHandlerActive && defaultDragHandler ) {
        attachDefaultHandler( DRAG_HANDLERS, 'dragHandlers.' + defaultDragHandler, 'dragActions' );
    }

    activeHandler = null;

    let isDropHandlerActive = isHandlerActiveForView( currentViewName, 'dropHandlers' );
    if( isDropHandlerActive && activeHandler ) {
        setDragAndDropHandlersOnVM( declViewModel, DROP_HANDLERS, activeHandler.handlers, dragDropConfig.actions );
    } else if( !isDropHandlerActive && defaultDropHandler ) {
        isDropHandlerActive = true;
        attachDefaultHandler( DROP_HANDLERS, 'dropHandlers.' + defaultDropHandler, 'dropActions' );
    }

    /*
     * The view should not be draggable
     * Hence, attaching only the drop listeners for the view
     */
    if( isDropHandlerActive ) {
        element.classList.add( 'aw-widgets-droppable' );
        exports.setupDragAndDrop( element, callbackAPIs, declViewModel );
        return true;
    }
    return false;
};

const initialization = () => {
    loadConfiguration();
    createDragAndDropHandlersMap();
    //Attach event listner to block the drop effect on the page for files
    attachDocEventListners();
};
initialization();


exports = {
    setupDragAndDropOnView,
    setupDragAndDrop,
    areDnDHandelersDefined,
    setDragAndDropHandlersOnVM,
    initialization// exporting this method so that this service is testable
};

export default exports;

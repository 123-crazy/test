// Copyright (c) 2020 Siemens
/* global PRODUCTION */
/**
 * This module provides a way for declarative framework to do debugging.
 *
 * @module js/breakpointService
 * @namespace breakpointService
 */

/**
 *  Below is the sample input for breakpoints.
 */
let sampleInput = {
    b1: {
        lifeCycles: {
            vmName0: [ 'init', 'mount' ],
            vmName1: [ 'destroy' ]
        },
        actions: {
            vmName0: {
                actionId0: [ 'pre' ],
                actionId1: [ 'post' ]
            }
        },
        globalEvents: {
            'aw.include': {
                data1: 'data1',
                data2: 'data2'
            },
            'aw.*': {
                data1: 'data1',
                data2: 'data2'
            }
        },
        ctx: {
            'aw.test': [ 'register', 'unregister', 'modify' ]
        },
        commands: [ 'cm1', 'cmd2' ]
    },

    b2: {
        lifeCycles: {
            vmName0: [ 'init', 'mount' ],
            vmName1: [ 'destroy' ]
        },
        actions: {
            vmName0: {
                actionId0: [ 'pre' ],
                actionId1: [ 'post' ]
            }
        },
        globalEvents: {
            'aw.include': {
                data1: 'data1',
                data2: 'data2'
            },
            'aw.*': {
                data1: 'data1',
                data2: 'data2'
            }
        },
        ctx: {
            'aw.test': [ 'register', 'unregister', 'modify' ]
        }
    }
};

let breakpointsModel = {};
let optBrkModel = new Map();
let enableBrkPoints = true;

export let isMinified = () => Boolean( PRODUCTION );


/**
 *
 * @param {*} isEnable boolean true or false to enable or disable the breakpoint.
 */
export let enableBreakPoints = ( isEnable ) => {
    enableBrkPoints = isEnable;
};

/**
 *  This function is used to give back all the exiting breakpoints
 *  to the chrome extension to re-generate the breakpoint UI.
 *  @returns {*} returns the breakPoinModel Object.
 */
export let getAllBreakPoints = () => {
    return breakpointsModel;
};
/**
 * This is a immutable function, which takes two array merge them, remove the
 * duplicates and return a new array.
 * @param {*} array1 The first input array. The array should only contain strings.
 * @param {*} array2 The second input array. The array should only contain strings.
 * @returns {*} a new concatinated array.
 */
let mergeAndRemoveDuplicates = ( array1, array2 ) => {
    let concatArray = [ ...array1, ...array2 ];
    return concatArray.reduce( ( finalArray, item ) => {
        if( finalArray.includes( item ) ) {
            return finalArray;
        }
        return [ ...finalArray, item ];
    }, [] );
};

/**
 *
 * @param {*} model  The input model
 * @param {*} holder the holder object
 */
let processInputModel = ( model, holder ) => {
    let keys = Object.keys( model );
    keys.forEach( ( key ) => {
        let objValue = model[ key ] instanceof Array ? model[ key ] : [ model[ key ] ];
        if( !holder.has( key ) ) {
            holder.set( key, objValue );
        } else {
            let srcValue = holder.get( key );
            let finalArray = mergeAndRemoveDuplicates( srcValue, objValue );
            holder.set( key, finalArray );
        }
    } );
};

/**
 *
 * @param {*} structure The input structure for breakpoints.
 */
export let addBreakPoint = ( structure ) => {
    Object.keys( structure ).forEach( ( breakPointName ) => {
        breakpointsModel[ breakPointName ] = structure[ breakPointName ];
    } );
    generateOptimizedModel();
};

/**
 * This API is to remove the breakpoint.
 * @param {*} breakPointName name of the breakpoint
 */
export let removeBreakPoint = ( breakPointName ) => {
    if( breakpointsModel[ breakPointName ] ) {
        delete breakpointsModel[ breakPointName ];
        generateOptimizedModel();
    }
};

export let removeAllBreakPoints = () => {
    breakpointsModel = {};
    generateOptimizedModel();
};

/**
 * This API should be used to check if any condtion
 * matches with any exisitng breakpoint condtions.
 *
 * @param {*} breakpointType Name of the breakpoint type
 * @param  {...any} args This differs for breakpoint types
 * @returns {true/false} boolean
 */
export let hasConditionSatisfied = ( breakpointType, ...args ) => {
    let isCondMatched = false;
    let eventName;
    let actionId;
    let stage;
    let panelId;
    let ctxKey;
    let commandName;
    let fromState;
    let toState;
    let dataParserId;
    if( isMinified() || !enableBrkPoints ) {
        return false;
    }
    switch ( breakpointType ) {
        case 'lifeCycles':
            panelId = args[ 0 ];
            stage = args[ 1 ];
            isCondMatched = optBrkModel.has( 'lifeCycles' ) ?
                optBrkModel.get( 'lifeCycles' ).breakPointCondSatisfied( panelId, stage ) : false;
            break;

        case 'actions':
            panelId = args[ 0 ];
            actionId = args[ 1 ];
            stage = args[ 2 ];
            isCondMatched = optBrkModel.has( 'actions' ) ?
                optBrkModel.get( 'actions' ).breakPointCondSatisfied( panelId, actionId, stage ) : false;
            break;

        case 'events':
            panelId = args[ 0 ];
            eventName = args[ 1 ];
            isCondMatched = optBrkModel.has( 'events' ) ?
                optBrkModel.get( 'events' ).breakPointCondSatisfied( panelId, eventName ) : false;
            break;

        case 'dataParsers':
            panelId = args[ 0 ];
            dataParserId = args[ 1 ];
            isCondMatched = optBrkModel.has( 'dataParsers' ) ?
                optBrkModel.get( 'dataParsers' ).breakPointCondSatisfied( panelId, dataParserId ) : false;
            break;

        case 'globalEvents':
            eventName = args[ 0 ];
            isCondMatched = optBrkModel.has( 'globalEvents' ) ?
                optBrkModel.get( 'globalEvents' ).breakPointCondSatisfied( eventName ) : false;
            break;

        case 'ctx':
            ctxKey = args[ 0 ];
            stage = args[ 1 ];
            isCondMatched = optBrkModel.has( 'ctx' ) ?
                optBrkModel.get( 'ctx' ).breakPointCondSatisfied( ctxKey, stage ) : false;
            break;

        case 'commands':
            commandName = args[ 0 ];
            isCondMatched = optBrkModel.has( 'commands' ) ?
                optBrkModel.get( 'commands' ).breakPointCondSatisfied( commandName ) : false;
            break;

        case 'routes':
            fromState = args[ 0 ];
            toState = args[ 1 ];
            isCondMatched = optBrkModel.has( 'routes' ) ?
                optBrkModel.get( 'routes' ).breakPointCondSatisfied( fromState, toState ) : false;
            break;
    }
    return isCondMatched;
};

/**
 * This optimized model holds a class object (singleton class) against every breakpoint type.
 * example
 *      {
 *          "lifeCycles" : new LifeCycleModel(),
 *          "actions" : new ActionModel(),
 *          "globalEvents" : new GlobalEventsModel(),
 *          "ctx" : new CtxModel() *
 *       }
 */
let generateOptimizedModel = () => {
    let breakPointTypes = [ 'lifeCycles', 'actions', 'globalEvents', 'ctx', 'commands', 'events', 'routes', 'dataParsers' ];
    /**
     *  Whenever we re-generate the optimized view-model
     *  we should take care to clear all the exiting breakpoints.
     */
    for( let breakPointType of breakPointTypes ) {
        if( optBrkModel.has( breakPointType ) ) {
            // Every class from optBrkModel.get( breakPointType ) has clear() method implemented.
            optBrkModel.get( breakPointType ).clearConditions();
        }
    }

    for( let breakPointName in breakpointsModel ) {
        let breakPointObj = breakpointsModel[ breakPointName ];
        for( let breakPointType of breakPointTypes ) {
            switch ( breakPointType ) {
                case 'lifeCycles':
                    generateLifeCycleModel( breakPointObj.lifeCycles );
                    break;
                case 'actions':
                    generateActionModel( breakPointObj.actions );
                    break;
                case 'globalEvents':
                    generateGlobalEventsModel( breakPointObj.globalEvents );
                    break;
                case 'events':
                    generateEventModel( breakPointObj.events );
                    break;
                case 'dataParsers':
                    generateDataParserModel( breakPointObj.dataParsers );
                    break;
                case 'ctx':
                    generateCtxModel( breakPointObj.ctx );
                    break;
                case 'commands':
                    generateCommandsModel( breakPointObj.commands );
                    break;
                case 'routes':
                    generateRoutesModel( breakPointObj.routes );
                    break;
            }
        }
    }
};

/**
 * This is a singleton 'lifeCycles' class, which holds all the breakpoint
 * information related to lifecycles for all breakpoints.
 * This also exposes an API 'breakPointCondSatisfied' which will be consumed to
 * check the breakpoint condition.
 *  @param {*} model the input model to create breakpoints for viewmodel lifeCycle.
 * Every class must have atlease two methods to be implemented
 * 1.breakPointCondSatisfied()
 * 2.clearConditions();
 *
 */
let generateLifeCycleModel = ( model ) => {
    class LifeCycleModel {
        constructor() {
            if( LifeCycleModel.instance ) {
                return LifeCycleModel.instance;
            }
            LifeCycleModel.instance = this;
            this.holder = new Map();
            return this;
        }
        addInput( lifeCycleInput ) {
            processInputModel( lifeCycleInput, this.holder );
        }
        hasPanelId( panelId ) {
            return this.holder.has( panelId );
        }
        getStage( panelId ) {
            return this.holder.get( panelId );
        }
        breakPointCondSatisfied( panelId, stage ) {
            if( this.hasPanelId( panelId ) ) {
                return this.holder.get( panelId ).includes( stage );
            }
            return false;
        }
        clearConditions() {
            this.holder.clear();
        }
    }
    if( !optBrkModel.has( 'lifeCycles' ) ) {
        optBrkModel.set( 'lifeCycles', new LifeCycleModel() );
    }
    if( model ) {
        optBrkModel.get( 'lifeCycles' ).addInput( model );
    }
};

/**
 *
 * @param {*} model the input model to create breakpoints for viewmodel actions.
 * Every class must have atlease two methods to be implemented
 * 1.breakPointCondSatisfied()
 * 2.clearConditions();
 */
let generateActionModel = ( model ) => {
    class ActionModel {
        constructor() {
            if( ActionModel.instance ) {
                return ActionModel.instance;
            }
            ActionModel.instance = this;
            this.modelHolder = new Map();
            return this;
        }
        addInput( actionInputModel ) {
            let panelNames = Object.keys( actionInputModel );
            for( let panelName of panelNames ) {
                if( !this.modelHolder.has( panelName ) ) {
                    let actionModel = new Map();
                    let actionObj = actionInputModel[ panelName ];
                    Object.keys( actionObj ).forEach( ( actionName ) => {
                        let actionStage = actionObj[ actionName ] instanceof Array ? actionObj[ actionName ] : [ actionObj[ actionName ] ];
                        actionModel.set( actionName, actionStage );
                    } );
                    this.modelHolder.set( panelName, actionModel );
                } else {
                    let srcActionModel = this.modelHolder.get( panelName );
                    let newActionModel = actionInputModel[ panelName ];
                    processInputModel( newActionModel, srcActionModel );
                }
            }
        }
        hasPanelId( panelId ) {
            return this.modelHolder.has( panelId );
        }

        hasActionId( panelId, actionId ) {
            if( this.modelHolder.has( panelId ) ) {
                return this.modelHolder.get( panelId ).has( actionId );
            }
            return false;
        }

        breakPointCondSatisfied( panelId, actionId, stage ) {
            if( this.hasActionId( panelId, actionId ) ) {
                return this.modelHolder.get( panelId ).get( actionId ).includes( stage );
            }
            return false;
        }

        clearConditions() {
            this.modelHolder.clear();
        }
    }
    if( !optBrkModel.has( 'actions' ) ) {
        optBrkModel.set( 'actions', new ActionModel() );
    }

    if( model ) {
        optBrkModel.get( 'actions' ).addInput( model );
    }
};

let generateEventModel = ( model ) => {
    class EventModel {
        constructor() {
            if( EventModel.instance ) {
                return EventModel.instance;
            }
            EventModel.instance = this;
            this.modelHolder = new Map();
            return this;
        }
        addInput( eventInputModel ) {
            processInputModel( eventInputModel, this.modelHolder );
        }
        hasPanelId( panelId ) {
            return this.modelHolder.has( panelId );
        }
        hasEventName( panelId, eventName ) {
            try {
                if( this.hasPanelId( panelId ) ) {
                    let eventNames = this.modelHolder.get( panelId );
                    // If user provides an incorrect regular expression
                    // the RegExp constructor throws an exception.
                    // We do not want to throw any exception due to user error
                    // hence, eating up the exception and throwing false.
                    //let regexp = RegExp( eventName, 'g' );
                    //return eventNames.some( e => regexp.test( e ) );
                    return eventNames.some( e => {
                        try {
                            let regexp = RegExp( e, 'g' );
                            return regexp.test( eventName );
                        } catch ( e ) {
                            return false;
                        }
                    } );
                }
                return false;
            } catch ( e ) {
                return false;
            }
        }
        breakPointCondSatisfied( panelId, eventName ) {
            return this.hasEventName( panelId, eventName );
        }
        clearConditions() {
            this.modelHolder.clear();
        }
    }
    if( !optBrkModel.has( 'events' ) ) {
        optBrkModel.set( 'events', new EventModel() );
    }

    if( model ) {
        optBrkModel.get( 'events' ).addInput( model );
    }
};

let generateDataParserModel = ( model ) => {
    class DataParserModel {
        constructor() {
            if( DataParserModel.instance ) {
                return DataParserModel.instance;
            }
            DataParserModel.instance = this;
            this.modelHolder = new Map();
            return this;
        }
        addInput( eventInputModel ) {
            processInputModel( eventInputModel, this.modelHolder );
        }
        hasPanelId( panelId ) {
            return this.modelHolder.has( panelId );
        }
        hasDataParser( panelId, dataParserId ) {
            try {
                if( this.hasPanelId( panelId ) ) {
                    let dataParsers = this.modelHolder.get( panelId );
                    // If user provides an incorrect regular expression
                    // the RegExp constructor throws an exception.
                    // We do not want to throw any exception due to user error
                    // hence, eating up the exception and throwing false.
                    //let regexp = RegExp( eventName, 'g' );
                    //return eventNames.some( e => regexp.test( e ) );
                    return dataParsers.some( e => {
                        try {
                            let regexp = RegExp( e, 'g' );
                            return regexp.test( dataParserId );
                        } catch ( e ) {
                            return false;
                        }
                    } );
                }
                return false;
            } catch ( e ) {
                return false;
            }
        }
        breakPointCondSatisfied( panelId, dataParserId ) {
            return this.hasDataParser( panelId, dataParserId );
        }
        clearConditions() {
            this.modelHolder.clear();
        }
    }
    if( !optBrkModel.has( 'dataParsers' ) ) {
        optBrkModel.set( 'dataParsers', new DataParserModel() );
    }

    if( model ) {
        optBrkModel.get( 'dataParsers' ).addInput( model );
    }
};

/**
 * This is a singleton 'globalEvents' class, which holds all the breakpoint
 * information related to global events for all breakpoints.
 * This also exposes an API 'breakPointCondSatisfied' which will be consumed to
 * check the breakpoint condition.
 * @param {*} model
 * Every class must have atlease two methods to be implemented
 * 1.breakPointCondSatisfied()
 * 2.clearConditions();
 */
let generateGlobalEventsModel = ( model ) => {
    class GlobalEventsModel {
        constructor() {
            if( GlobalEventsModel.instance ) {
                return GlobalEventsModel.instance;
            }
            GlobalEventsModel.instance = this;
            // ModelHolder is not being used currently. It would be used
            // once we provide the support for matching the eventData
            this.modelHolder = new Map();
            this.eventNames = [];
            return this;
        }
        addInput( GlobalEventsModel ) {
            Object.keys( GlobalEventsModel ).forEach( ( eventName ) => {
                let eventData = GlobalEventsModel[ eventName ];
                this.modelHolder.set( eventName, eventData );
                this.eventNames.push( eventName );
            } );
        }
        hasEventName( eventName ) {
            try {
                // If user provides an incorrect regular expression
                // the RegExp constructor throws an exception.
                // We do not want to throw any exception due to user error
                // hence, eating up the exception and throwing false.
                return this.eventNames.some( e => {
                    try {
                        let regexp = RegExp( e, 'g' );
                        return regexp.test( eventName );
                    } catch ( e ) {
                        return false;
                    }
                } );
            } catch ( e ) {
                return false;
            }
        }

        breakPointCondSatisfied( eventName ) {
            return this.hasEventName( eventName );
        }

        clearConditions() {
            this.modelHolder.clear();
            this.eventNames.length = 0;
        }
    }

    if( !optBrkModel.has( 'globalEvents' ) ) {
        optBrkModel.set( 'globalEvents', new GlobalEventsModel() );
    }
    if( model ) {
        optBrkModel.get( 'globalEvents' ).addInput( model );
    }
};

/**
 *
 * @param {*} model the input model to create breakpoints for app context changes.
 * Every class must have atlease two methods to be implemented
 * 1.breakPointCondSatisfied()
 * 2.clearConditions();
 */
let generateCtxModel = ( model ) => {
    class CtxModel {
        constructor() {
            if( CtxModel.instance ) {
                return CtxModel.instance;
            }
            CtxModel.instance = this;
            this.holder = new Map();
            this.ctxKeys = [];
            return this;
        }
        addInput( ctxInput ) {
            processInputModel( ctxInput, this.holder );
            Object.keys( ctxInput ).forEach( ( ctxkey ) => {
                this.ctxKeys.push( ctxkey );
            } );
        }
        hasCtxKey( userKey, stage ) {
            try {
                let userKeyExist = ( ctxKey ) => {
                    try {
                        let regexp = RegExp( ctxKey, 'g' );
                        return regexp.test( userKey );
                    } catch {
                        return false;
                    }
                };
                if( this.ctxKeys.some( userKeyExist ) ) {
                    return this.holder.get( userKey ).includes( stage );
                }
                return false;
            } catch ( e ) {
                return false;
            }
        }
        getStage( panelId ) {
            return this.holder.get( panelId );
        }
        breakPointCondSatisfied( ctxKey, stage ) {
            return this.hasCtxKey( ctxKey, stage );
        }
        clearConditions() {
            this.holder.clear();
        }
    }
    if( !optBrkModel.has( 'ctx' ) ) {
        optBrkModel.set( 'ctx', new CtxModel() );
    }
    if( model ) {
        optBrkModel.get( 'ctx' ).addInput( model );
    }
};

/**
 *
 * @param {*} model the input model to create breakpoints for commands.
 * Every class must have atlease two methods to be implemented
 * 1.breakPointCondSatisfied()
 * 2.clearConditions();
 */
let generateCommandsModel = ( model ) => {
    class CommandsModel {
        constructor() {
            if( CommandsModel.instance ) {
                return CommandsModel.instance;
            }
            CommandsModel.instance = this;
            this.holder = [];
            return this;
        }
        addInput( commands ) {
            if( commands instanceof Array ) {
                this.holder = [ ...this.holder, ...commands ];
            }
            this.holder.push( commands );
        }
        hasCommandName( commandName ) {
            return this.holder.includes( commandName );
        }
        breakPointCondSatisfied( commandName ) {
            return this.hasCommandName( commandName );
        }
        clearConditions() {
            this.holder.length = 0;
        }
    }
    if( !optBrkModel.has( 'commands' ) ) {
        optBrkModel.set( 'commands', new CommandsModel() );
    }
    if( model ) {
        optBrkModel.get( 'commands' ).addInput( model );
    }
};

/**
 *
 * @param {*} model the input model to create breakpoints for route changes.
 * Every class must have atlease two methods to be implemented
 * 1.breakPointCondSatisfied()
 * 2.clearConditions();
 */
let generateRoutesModel = ( model ) => {
    class RoutesModel {
        constructor() {
            if( RoutesModel.instance ) {
                return RoutesModel.instance;
            }
            RoutesModel.instance = this;
            this.holder = new Map();
            return this;
        }
        addInput( model ) {
            Object.keys( model ).forEach( ( fromState ) => {
                let toState = model[ fromState ] ? model[ fromState ] : null;
                this.holder.set( fromState, toState );
            } );
        }
        breakPointCondSatisfied( fromState, toState ) {
            if( this.holder.has( fromState ) ) {
                if( !this.holder.get( fromState ) ) {
                    return true;
                }
                return this.holder.get( fromState ) === toState;
            }
            return false;
        }
        clearConditions() {
            this.holder.clear();
        }
    }
    if( !optBrkModel.has( 'routes' ) ) {
        optBrkModel.set( 'routes', new RoutesModel() );
    }
    if( model ) {
        optBrkModel.get( 'routes' ).addInput( model );
    }
};

let breakpointSvc = {};
export default breakpointSvc = {
    addBreakPoint,
    removeBreakPoint,
    removeAllBreakPoints,
    hasConditionSatisfied,
    enableBreakPoints,
    getAllBreakPoints,
    isMinified
};
window.breakpointSvc = breakpointSvc;

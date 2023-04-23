// Copyright (c) 2020 Siemens

/**
 * This module provides a way for declarative framework to do outgoing calls like SOA or REST.
 *
 * @module js/actionPropertiesService
 *
 * @namespace actionPropertiesService
 */
import _ from 'lodash';
import localeSvc from 'js/localeService';
import graphQLModelSvc from 'js/graphQLModelService';
import uwPropertySvc from 'js/uwPropertyService';

// eslint-disable-next-line valid-jsdoc

/**
 * Define public API
 */
let exports = {};
const policy = 'policy';
const dataParsers = 'dataParsers';

/**
 * Setup to map labels to local names.
 */
let localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.actionName', true ).then( result => localeMap.actionName = result );
};

export let handleNestedProperties = function( nestedProps, actionDefinition, emptyVal, propValue ) {
    let nestedProp1;
    let nestedProp2;
    let nestedProp3;
    let propValueIn = propValue;

    if( nestedProps.length === 2 ) {
        nestedProp1 = nestedProps[ 0 ];
        nestedProp2 = nestedProps[ 1 ];

        let nestedPropDef = actionDefinition[ nestedProp1 ];
        if( nestedProp1 === dataParsers ) {
            nestedPropDef = actionDefinition[ nestedProp1 ] ? actionDefinition[ nestedProp1 ][0] : null;
        }

        if( nestedPropDef && nestedPropDef[ nestedProp2 ] ) {
            propValueIn = nestedPropDef[ nestedProp2 ];
        } else {
            propValueIn = emptyVal;
        }
    } else if( nestedProps.length === 3 ) {
        nestedProp1 = nestedProps[ 0 ];
        nestedProp2 = nestedProps[ 1 ];
        nestedProp3 = nestedProps[ 2 ];

        if( actionDefinition[ nestedProp1 ] && actionDefinition[ nestedProp1 ][ nestedProp2 ]
            && actionDefinition[ nestedProp1 ][ nestedProp2 ][ nestedProp3 ] ) {
                propValueIn = actionDefinition[ nestedProp1 ][ nestedProp2 ][ nestedProp3 ];
        } else {
            propValueIn = emptyVal;
        }
    }

    return propValueIn;
};

/**
 * Validate if the preceding connection supports failure type
 *
 * @param {Object} gqlResult - graphql response object
 * @param {Object} ctx - application context object
 * @param {Object} declViewModelIn - declarative view model
 * @param {Object} actionDefinition - action definition
 *
 * @returns {Array} array of view model properties
 */
export let convertActionProps = function( gqlResult, ctx, declViewModelIn, actionDefinition ) {
    var gqlActionPropsDef = {};
    declViewModelIn.propertyViewData = null;

    let vmPropsMap = {};
    let actionNameProp = uwPropertySvc.createViewModelProperty( 'actionName', localeMap.actionName, 'STRING', ctx.graph.selected.model.modelObject.name, [ ctx.graph.selected.model.modelObject.name ] );
    actionNameProp.renderingHint = 'textbox';
    actionNameProp.maxLength = 128;

    let vmPropsList = [];

    _.get( gqlResult, 'data.actionType.props' ).map( function( value ) {
        let key = value.id.replace( /\./g, '_' );
        let emptyVal = value.type === 'object' ? {} : '';
        emptyVal = value.type === 'array' ? [] : emptyVal;

        let propValue = actionDefinition[ key ];
        // traverse nested properties
        let nestedProps = key.split( '_' );
        if( nestedProps[ 0 ] !== policy ) {
            propValue = handleNestedProperties( nestedProps, actionDefinition, emptyVal, propValue );
        } else {
            // Policy is an object but it has types which is an array, so unable to represent as individual properties. instead showing as code editor
            emptyVal = {};
            key = policy;
        }
        gqlActionPropsDef[ key ] = propValue ? propValue : emptyVal;

        localeMap[ key ] = localeSvc.getLoadedTextFromKey( 'ActionBuilderMessages.' + key );
        return value;
    } );

    if( gqlActionPropsDef ) {
        vmPropsList = graphQLModelSvc.convertGqlPropsToVMProps( gqlActionPropsDef, localeMap, [ 'events', 'actionMessages' ], true );
        vmPropsList.splice( 1, 0, actionNameProp );

        vmPropsMap = _.keyBy( vmPropsList, obj => obj.propertyName );

        _.forEach( vmPropsMap, function( value ) {
            value.getViewModel = function() {
                return declViewModelIn;
            };
        } );
    }

    return vmPropsMap;
};

/**
 * Update graph model for all action types with properties provided in the details panel
 *
 * @param {Object} ctx - global context object
 * @param {Object} data - declarative view model
 * @param {Object} type - action type
 * @param {Object} actionDef - action definition in graph model
 * @param {Object} selModelObject - selected model object in graph model
 * @param {Object} selNodeObject - selected node object in graph model
 */
export let updateActionTypeProps = function( ctx, data, type, actionDef, selModelObject, selNodeObject ) {
    _.forEach( data.actionProps, function( actionProp, key ) {
        if( key === 'actionName' ) {
            ctx.graph.graphModel.graphControl.graph.updateNodeBinding( selNodeObject, { Name: actionProp.dbValue } );
            selModelObject.name = actionProp.dbValue;
        } else if( key.split( '_' ).length > 1 ) {
            // traverse nested properties
            let nestedProps = key.split( '_' );
            let nestedProp1;
            let nestedProp2;
            let nestedProp3;

            if( nestedProps.length === 2 ) {
                nestedProp1 = nestedProps[ 0 ];
                nestedProp2 = nestedProps[ 1 ];

                if( nestedProp1 === dataParsers ) {
                    actionDef[ nestedProp1 ] = actionDef[ nestedProp1 ] ? actionDef[ nestedProp1 ] : [];

                    if( actionDef[ nestedProp1 ].length > 0 ) {
                        actionDef[ nestedProp1 ][ 0 ][ nestedProp2 ] = actionProp.dbValue;
                    } else {
                        actionDef[ nestedProp1 ].push( { [nestedProp2]: actionProp.dbValue } );
                    }
                } else {
                    actionDef[ nestedProp1 ] = actionDef[ nestedProp1 ] ? actionDef[ nestedProp1 ] : {};
                    actionDef[ nestedProp1 ][ nestedProp2 ] = actionProp.dbValue;
                }
            } else if( nestedProps.length === 3 ) {
                nestedProp1 = nestedProps[ 0 ];
                nestedProp2 = nestedProps[ 1 ];
                nestedProp3 = nestedProps[ 2 ];

                actionDef[ nestedProp1 ] = actionDef[ nestedProp1 ] ? actionDef[ nestedProp1 ] : {};
                actionDef[ nestedProp1 ][ nestedProp2 ] = actionDef[ nestedProp1 ][ nestedProp2 ] ? actionDef[ nestedProp1 ][ nestedProp2 ] : {};
                actionDef[ nestedProp1 ][ nestedProp2 ][ nestedProp3 ] = actionProp.dbValue;
            }
        } else {
            actionDef[ key ] = actionProp.dbValue;
        }
    } );
};

loadConfiguration();

exports = {
    loadConfiguration,
    convertActionProps,
    updateActionTypeProps
};
export default exports;

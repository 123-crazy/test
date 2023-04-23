// Copyright (c) 2020 Siemens
// eslint-disable-next-line valid-jsdoc

/**
 * This file contains the utility methods of aw-layout-slot.
 * @module js/layoutSlotService
 */
import app from 'app';
import _ from 'lodash';
import commandConfigUtilsvc from 'js/commandConfigUtils.service';
import conditionSvc from 'js/conditionService';
import appCtxSvc from 'js/appCtxService';
import { getSvcSync as getCmdProvider } from 'js/commandConfiguration.command-provider';

var exports = {};

/**
 * Find active slots  for the given application..
 *
 * @param {Object} allSlots - all slots for active application
 * @param {Object} conditionsObj - Scope to execute the command with context
 * @param {Object} context - Scope to execute the command with context
 *
 * @return {Object} most appropriate active slot.
 */
var findActiveSlotFromContext = function( allSlots, conditionsObj, context ) {
    var mostAppropriateActionHandler = null;
    var mostAppropriateConditionLength = -1;
    _.forEach( allSlots, function( slotConfig ) {
        var conditions = _.get( slotConfig, 'activeWhen.condition' );
        if( conditions ) {
            var conditionExpression = commandConfigUtilsvc.getConditionExpression( conditionsObj, conditions );
            var isValidCondition = conditionSvc.evaluateCondition( context, conditionExpression );
            var expressionLength = conditionExpression.length;
            if( _.isObject( conditionExpression ) ) {
                expressionLength = JSON.stringify( conditionExpression ).length;
            }
            if( isValidCondition &&
                expressionLength > mostAppropriateConditionLength ) {
                mostAppropriateConditionLength = expressionLength;
                mostAppropriateActionHandler = slotConfig;
            }
        } else {
            mostAppropriateActionHandler = slotConfig;
        }
    } );
    return mostAppropriateActionHandler;
};

/**
 * The base logic to bind a slot directly to its conditions.
 *
 * Bind a list of slot with condtions for matching name. This will manage all of the different
 * watches that dynamically update the page with slots.
 *
 * @param {Object} layoutContributions slot json
 * @param {Object} scope scope
 * @param {Object} renderCurrentView call back function
 */
export let bindSlot = function( layoutContributions, scope, renderCurrentView ) {
    // only push those slots which have the same name current slot
    var arraySlots = Object.keys( layoutContributions.slots ).filter( function( key ) {
        return layoutContributions.slots[ key ].name === scope.name;
    } ).map( function( key ) {
        return layoutContributions.slots[ key ];
    } );
    if( arraySlots && arraySlots.length > 0 ) {
        getCmdProvider().bindCommand( layoutContributions, scope, {}, {}, arraySlots, renderCurrentView );
    }
};

/**
 * Find active slot  for the given slot contributions..
 *
 * @param {Object} allSlotConfigs - all slots for application
 * @param {Object} conditions - condition object
 *
 * @return {Object} most appropriate active slot.
 */

export let findActiveSlot = function( allSlotConfigs, conditions ) {
    var evaluationContext = {};
    evaluationContext.ctx = appCtxSvc.ctx;
    var activeSlot = findActiveSlotFromContext( allSlotConfigs, conditions, evaluationContext );
    return activeSlot;
};

exports = {
    findActiveSlot,
    bindSlot
};
export default exports;
/**
 * This service provides functions related to the slot configuration.
 *
 * @memberof NgServices
 * @member layoutSlotService
 */
app.factory( 'layoutSlotService', () => exports );

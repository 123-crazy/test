// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Service for getting the correct perform task panel in secondary area or tool and info area.
 *
 * @module js/Awp0PerformTaskPanelService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import conditionService from 'js/conditionService';
import appCtxSvc from 'js/appCtxService';
import cfgSvc from 'js/configurationService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Cached reference to '$q' service.
 */

/**
 * Define public API
 */
var exports = {};

/**
 * Get contributing perform task panels that will be visible to user
 *
 * @param {String} key COntribution key for contribtuion need to be search
 * @param {Obejct} modelObject Selected obejct from UI
 * @param {Obejct} isToolAndInfoAreaContext True/false value based on panel need to be showin in tool and info area or secondary area
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let populateContributedPerformTaskPanel = function( key, modelObject, isToolAndInfoAreaContext ) {
    var deferred = AwPromiseService.instance.defer();
    cfgSvc.getCfg( key ).then( function( performTaskPanels ) {
        var contributedPerformPanels = [];

        if( !performTaskPanels || performTaskPanels.length <= 0 ) {
            return deferred.resolve( null );
        }
        _.forEach( performTaskPanels, function( panel ) {

            var performPanel = {
                priority: panel.priority,
                condition: panel.condition,
                performPanelId: panel.performPanelId,
                id: panel.id
            };

            contributedPerformPanels.push( performPanel );

        } );

        // Check all contributed panels are not null and length > 0 then only
        // get the active perform panel to shwon the user based on condition
        if( contributedPerformPanels.length > 0 ) {
            var activePerformPanelId = null;
            var activePerformPanel = exports.getActivePerformPanel( contributedPerformPanels, modelObject );
            if( activePerformPanel && activePerformPanel.performPanelId ) {
                activePerformPanelId = activePerformPanel.performPanelId;
            }

            var context = {
                "activePerformTaskPanelId": activePerformPanelId,
                "contributingPerformTaskPanels": contributedPerformPanels,
                "isToolAndInfoAreaContext": isToolAndInfoAreaContext
            };

            // Register the values on context
            appCtxSvc.registerCtx( 'performTaskCtx', context );

            deferred.resolve( activePerformPanelId );
        } else {
            deferred.resolve( null );
        }
    } );
    return deferred.promise;
};

/**
 * Update the opened perform task panel context or if not opened then register the
 * context for valid perform task panel that will be shown to the user.
 *
 * @param {object} modelObject - the current selection object from UI
 */
export let updatePerformTaskPanelContent = function( modelObject ) {
    var performTaskCtx = appCtxSvc.getCtx( "performTaskCtx" );

    // Check if context is set already then use that information otherwise get the active perform task
    // panel information by reading all contributions
    if( performTaskCtx && performTaskCtx.contributingPerformTaskPanels && performTaskCtx.isToolAndInfoAreaContext ) {
        var activePerformTaskPanelId = null;
        var activePerformPanel = exports.getActivePerformPanel( performTaskCtx.contributingPerformTaskPanels, modelObject );
        if( activePerformPanel ) {
            activePerformTaskPanelId = activePerformPanel.performPanelId;
        }

        // Check if previous active perform task panel id registerd on ctx is same as new active
        // panel id then fire event to update the task panel otherwise update the context information
        if( performTaskCtx.activePerformTaskPanelId === activePerformTaskPanelId ) {
            eventBus.publish( 'Awp0PerformTask.updateInternalPanel' );
            return;
        }

        performTaskCtx.activePerformTaskPanelId = activePerformTaskPanelId;
        appCtxSvc.updateCtx( "performTaskCtx", performTaskCtx );
    } else {
        exports.populateContributedPerformTaskPanel( 'performTaskPanelConfiguration.perfromTaskToolAreaContribution', modelObject, true );
    }
};

/**
 * Evaluate conditions for all given panels and return the one with valid condition and highest priority
 * @param {Array} panels all contributing panels
 * @param {object} modelObject - the current selection object from UI
 *
 * @returns {Object} active perform task panel
 */
export let getActivePerformPanel = function( panels, modelObject ) {
    var activePerformPanel = null;
    if( panels ) {
        _.forEach( panels, function( panel ) {
            if( panel.condition ) {
                if( typeof panel.condition === 'string' ) {
                    var isConditionTrue = conditionService.evaluateCondition( {
                        modelObject: modelObject
                    }, panel.condition );
                    if( isConditionTrue ) {
                        if( !activePerformPanel || panel.priority > activePerformPanel.priority ) {
                            activePerformPanel = panel;
                        }
                    }
                }
            }
        } );
    }
    return activePerformPanel;
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0PerformTaskPanelService
 */

export default exports = {
    populateContributedPerformTaskPanel,
    updatePerformTaskPanelContent,
    getActivePerformPanel
};
app.factory( 'Awp0PerformTaskPanelService', () => exports );

// Copyright (c) 2020 Siemens

/**
 * Defines provider for commands from the View model definition
 *
 * @module js/commandConfiguration.command-provider
 */
import app from 'app';

// LCS-299148 Beyond Angular: Clean up app.getInjector usage
// for all exsiting `import 'commandConfiguration.command-provider'` case, they are good;
// for service conversion related to this, they can switch to use the new 'js/commandConfigurationService'
import CommandConfigurationService from 'js/commandConfigurationService';

// Angular service references
var commandConfigurationService;

var contribution = {

    /**
     * The priority of the command provider. Higher priority providers can overwrite commands from lower
     * priority providers.
     */
    priority: 1,

    /**
     * Get the command overlay that is active with the given command id.
     *
     * @param {String} commandId - Id of the command to get
     * @param {Object} context - Context to execute the command in
     * @param {Promise} deferred - Promise to resolve when done
     */
    getCommand: function( commandId, context, deferred ) {
        commandConfigurationService.getCommand( commandId, context ).then( deferred.resolve );
    },

    /**
     * Get the commands overlays from this provider.
     *
     * @param {String} commandAreaNameToken - Command area name token (tools and info, one step)
     * @param {Object} context - Additional context to use in command evaluation
     * @param {Promise} deferred - A promise containing the array of command overlays
     */
    getCommands: function( commandAreaNameToken, context, deferred ) {
        commandConfigurationService.getCommands( commandAreaNameToken, context ).then( deferred.resolve );
    }
};

export let getSvcSync = function() {
    return CommandConfigurationService.instance;
};

/**
 * Command configuration provider service
 * @param {String} key key
 * @param {Promise} deferred promise
 * @param {Object} $injector injector instance
 */
export default function( key, deferred ) {
    if( key === 'command-provider' ) {
        let injector = app.getInjector();
        if( injector ) {
            try {
                commandConfigurationService = CommandConfigurationService.instance;
                deferred.resolve( contribution );
            } catch ( e ) {
                deferred.resolve();
            }
        } else {
            deferred.resolve( contribution );
        }
    } else {
        deferred.resolve();
    }
}

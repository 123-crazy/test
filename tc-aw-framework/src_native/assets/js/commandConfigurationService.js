// Copyright (c) 2020 Siemens

/**
 * Defines provider for commands from the View model definition
 *
 * @module js/commandConfigurationService
 */
import app from 'app';
import _ from 'lodash';
import Debug from 'Debug';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import expressionParserUtils from 'js/expressionParserUtils';
import 'js/iconService';
import commandHandlerService from 'js/commandHandlerService';
import viewModelService from 'js/viewModelService';
import conditionService from 'js/conditionService';
import appCtxService from 'js/appCtxService';
import functional from 'js/functionalUtility.service';
import commandVisibilityService from 'js/commandVisibilityService';
import ccu from 'js/commandConfigUtils.service';
import debugService from 'js/debugService';

// Service Class
import AwBaseService from 'js/awBaseService';
import AwTimeoutSvc from 'js/awTimeoutService';
import AwPromiseSvc from 'js/awPromiseService';

var trace = new Debug( 'command:commandConfigurationService' );

/**
 * Command service to manage commands.
 *
 * @memberOf NgServices
 * @class commandService
 */
function CommandConfiguration() {
    var self = this;

    /**
     * Optimized view model json cached based on commandAreaNameToken
     */
    var optimizedViewModelCache = {};

    /**
     * Counter used to generate unique ids for dynamic placements
     */
    var dynamicPlacementCounter = 0;

    /**
     * Configure behavior for a specific behavior. Primarily used to determine
     * which anchors should be delayed (only sublocation anchors in 4.0)
     *
     * Will be refactored to be configurable post 4.0
     */
    var anchorDefinitionMap = {
        aw_navigation: {
            delay: 100
        },
        aw_display: {
            delay: 100
        },
        aw_oneStep: {
            delay: 100
        },
        aw_toolsAndInfo: {
            delay: 100
        },
        aw_footer: {
            delay: 100
        },
        aw_rightWall: {
            delay: 100
        },
        aw_primaryWorkArea: {
            delay: 100
        },
        aw_contextMenu2: {
            delay: 100
        }
    };

    /**
     * Create a zero compile command handler
     *
     * @param {String} cmdId Command id
     * @param {Object} command Command information
     * @param {Object} placement Placement information
     */
    var ZeroCompileCommandHandler = function( cmdId, command, placement ) {
        /**
         * Command id
         */
        this.commandId = cmdId;

        /**
         * Callable methods
         */
        this.callbackApi = {};

        /**
         * The current title of the command
         */
        this.title = command.title;

        /**
         * The name of the icon currently being used
         */
        this.iconId = command.iconId;

        /**
         * (Optional) Custom rendering to use for this command
         */
        this.template = command.template;

        /** Status flags (dynamically updated) */

        /**
         * Whether the command is currently visible
         */
        this.visible = false;

        /**
         * Whether the command is currently selected
         */
        this.isSelected = false;

        /**
         * Whether the command is currently enabled
         */
        this.enabled = true;

        /**
         * Whether the command is a group command
         *
         * Note: Not static - changes dynamically based on active children for "true" group commands
         */
        this.isGroupCommand = false;

        /**
         * extended tooltip
         */
        this.extendedTooltip = command.hasOwnProperty( 'extendedTooltip' ) ? command.extendedTooltip : 'extendedTooltipDefault';

        /**
         * command description
         */
        this.description = command.description;

        /**
         * Whether the command is a toggle command
         */
        this.isToggleCommand = command.isToggle;

        /**
         * Icon to use when selectWhen condition is false
         */
        this.iconIdWithoutSelection = this.iconId;

        /**
         * Title to use when selectWhen condition is false
         */
        this.titleWithoutSelection = this.title;

        /**
         * Extended tooltip  to use when selectWhen condition is false
         */
        this.extendedtitleWithoutSelection = this.extendedTooltip;

        /**
         * Title to use when selectWhen condition is false
         */
        this.descriptionWithoutSelection = this.description;

        /**
         * Icon to use when selectWhen condition is true
         */
        this.selectedIconId = command.selected ? command.selected.iconId || this.iconId : this.iconId;

        /**
         * Title to use when selectWhen condition is true
         */
        this.selectedTitle = command.selected ? command.selected.title || this.title : this.title;

        /**
         * Description to use when selectWhen condition is true
         */
        this.selectedDescription = command.selected ? command.selected.description || this.description : this.description;

        /**
         * Extended tooltip to use when selectWhen condition is true
         */
        this.selectedExtendedTooltip = command.selected && command.selected.extendedTooltip ? command.selected.extendedTooltip : undefined;

        /** Placement information (static, optional) */

        if( placement ) {
            /**
             * Whether the command is a child command
             */
            this.isChildCommand = placement.hasOwnProperty( 'parentGroupId' );

            /**
             * Parent group id
             */
            this.parentGroupId = placement.uiAnchor;

            /**
             * The command placement priority
             */
            this.priority = placement.priority;

            /**
             * Relative to setting used for command placement
             */
            this.relativeTo = placement.relativeTo;

            /**
             * Whether the group should appear as selected when the popup is open
             */
            this.showGroupSelected = placement.showGroupSelected !== false;

            /**
             * Placement information specific to a type of command bar
             *
             * Ex "position" which determines where in a cell the command appears (only applies to cell commands)
             */
            this.displayData = placement.cellDisplay;
        }
    };

    /**
     * Command configuration service "startup"
     *
     * Not ideal that startup is necessary, but this is the best spot to do these things
     */
    var initializeService = function() {
        // Put isMobileOS into context
        appCtxService.registerCtx( 'isMobileOS', browserUtils.isMobileOS );
        // Start the command visibility service. This will manage the "visibleServerCommands" context.
        commandVisibilityService.init();
    };
    initializeService();

    /**
     * Cached commandsViewModel load promise
     */
    var _gcvmPromise = null;

    /**
     * When notified that the commands view model has changed delete the shared promise and clear out the cache.
     *
     * This will make any following calls to the command provider call the configuration service again
     *
     * This event listener must be triggered before the listener in command bars.
     */
    eventBus.subscribe( 'configurationChange.commandsViewModel', function() {
        _gcvmPromise = null;
        optimizedViewModelCache = {};
    } );

    /**
     * Get and cache the full commandsViewModel
     *
     * Caching avoids repeating any preprocessing that is done
     *
     * @returns {Promise<Object>} The commandsViewModel from configuration service
     */
    var getCommandsViewModelPromise = function() {
        _gcvmPromise = _gcvmPromise || ccu.getCommandsViewModel();
        return _gcvmPromise;
    };

    /**
     * Execute function used by group commands which will just open a popup
     *
     * @returns {Object} configuration telling aw-command what to do
     */
    var openPopupCallback = function() {
        return {
            showPopup: true
        };
    };
    var isVisible = functional.getProp( 'visible' );

    /**
     * Get command information when a context is not provided
     *
     * Will only provide display information - command will not function
     *
     * @param {String} commandId Command id
     * @returns {Promise<Object>} Promise resolved with fake command overlay
     */
    var getCommandNoContext = function( commandId ) {
        return getCommandsViewModelPromise()
            .then( function( viewModelJson ) {
                var commandToReturn = viewModelJson.commands[ commandId ];
                if( commandToReturn ) {
                    // Retrieve only the command which is being asked for
                    var subCommand = {};
                    subCommand[ commandId ] = commandToReturn;
                    var subCommandsViewModel = {
                        commands: subCommand,
                        i18n: viewModelJson.i18n,
                        _viewModelId: 'commandsViewModel_nocontext'
                    };
                    return viewModelService.populateViewModelPropertiesFromJson( subCommandsViewModel, null, null, true, 'commandsViewModel' )
                        .then( function( populatedViewModelJson ) {
                            commandToReturn = populatedViewModelJson.commands[ commandId ];
                            if( commandToReturn ) {
                                commandHandlerService.setIcon( commandToReturn, commandToReturn.iconId );
                                commandToReturn.callbackApi = {};
                            }
                            populatedViewModelJson._internal.destroy();
                            return commandToReturn;
                        } );
                }
                return null;
            } );
    };

    /**
     * When the command title changes, update the title in the overlay
     *
     * @param {ViewModel} commandsViewModel The current commands view model
     * @param {Scope} scope Scope to bind to
     * @param {ZeroCompileCommandHandler} overlay command overlay
     */
    var bindCommandTitle = function( commandsViewModel, scope, overlay ) {
        scope.$watch( function getCommandTitle() {
            return commandsViewModel.commands[ overlay.commandId ].title;
        }, function updateTitle( newTitleVal ) {
            overlay.title = newTitleVal;
        } );
    };

    /**
     * Bind a regular group command to its child commands
     *
     * @param {Scope} scope The scope to use to bind
     * @param {ZeroCompileCommandHandler} overlay The parent handler
     * @param {List<ZeroCompileCommandHandler>} childCommands The child commands to bind to
     */
    var bindGroupCommand = function( scope, overlay, childCommands ) {
        var isEnabledWatch = null;
        var isSelectedWatch = null;
        var setParentEnabled = function( val ) {
            commandHandlerService.setIsEnabled( overlay, val );
        };
        var setParentVisible = function( val ) {
            commandHandlerService.setIsVisible( overlay, val );
        };
        var setParentSelected = function( val ) {
            overlay.isSelected = val;
        };
        scope.$watchCollection( function _getVisibleChildren() {
            return childCommands.filter( isVisible );
        }, function( visibleChildCommands ) {
            if( isEnabledWatch ) {
                isEnabledWatch();
                isEnabledWatch = null;
            }
            if( isSelectedWatch ) {
                isSelectedWatch();
                isSelectedWatch = null;
            }
            if( visibleChildCommands.length === 0 ) {
                // When no child commands are visible
                // The group command will be hidden
                setParentVisible( false );
            } else if( visibleChildCommands.length === 1 ) {
                // When a single child command is visible
                // The group will be visible
                setParentVisible( true );
                // It will not appear as a group command
                overlay.isGroupCommand = false;
                // It will only appear as enabled if the child command is enabled
                isEnabledWatch = scope.$watch( function() {
                    return visibleChildCommands[ 0 ].enabled;
                }, setParentEnabled );
                // If will only appear as selected if the child command is selected
                if( overlay.showGroupSelected ) {
                    isSelectedWatch = scope.$watch( function() {
                        return visibleChildCommands[ 0 ].enabled && visibleChildCommands[ 0 ].isSelected;
                    }, setParentSelected );
                }
                // Clicking on it will execute the child command
                overlay.callbackApi.execute = visibleChildCommands[ 0 ].callbackApi.execute;
            } else {
                // When more than one child is visible
                // The group will be visible
                setParentVisible( true );
                // It will not appear as a group command
                overlay.isGroupCommand = true;
                // It will only appear as enabled if at least one child command is enabled
                isEnabledWatch = scope.$watch( function getEnabledChild() {
                    for( var i = 0, len = visibleChildCommands.length; i < len; i++ ) {
                        var nxt = visibleChildCommands[ i ];
                        if( nxt.enabled ) {
                            return true;
                        }
                    }
                    return false;
                }, setParentEnabled );
                // It will only appear as enabled if at least one child command is selected
                if( overlay.showGroupSelected ) {
                    isSelectedWatch = scope.$watch( function getSelectedChild() {
                        for( var i = 0, len = visibleChildCommands.length; i < len; i++ ) {
                            var nxt = visibleChildCommands[ i ];
                            if( nxt.isSelected && nxt.enabled ) {
                                return true;
                            }
                        }
                        return false;
                    }, setParentSelected );
                }
                // When clicking it will open a popup
                overlay.callbackApi.execute = openPopupCallback;
            }
        } );
    };

    /**
     * Bind a shuttle group command to its child commands
     *
     * @param {Scope} scope The scope to use to bind
     * @param {ZeroCompileCommandHandler} overlay The parent handler
     * @param {List<ZeroCompileCommandHandler>} childCommands The child commands to bind to
     */
    var bindShuttleCommand = function( scope, overlay, childCommands ) {
        var getActiveChildWatch = null;
        var setParentVisible = function( val ) {
            commandHandlerService.setIsVisible( overlay, val );
        };
        var bindChildToParent = function( childCommand ) {
            if( childCommand ) {
                overlay.iconId = childCommand.iconId;
                overlay.title = childCommand.title;
                overlay.extendedTooltip = childCommand.extendedTooltip;
                overlay.description = childCommand.description;
            }
            // behavior is undefined when no selected child
            // TODO: clarify with UX and test
        };
        scope.$watchCollection( function _getVisibleChildren() {
            return childCommands.filter( isVisible );
        }, function( visibleChildCommands ) {
            if( getActiveChildWatch ) {
                getActiveChildWatch();
                getActiveChildWatch = null;
            }
            if( visibleChildCommands.length === 0 ) {
                // When no child commands are visible
                // The group command will be hidden
                setParentVisible( false );
            } else if( visibleChildCommands.length === 1 ) {
                // TODO: clarify with UX and test

                // When a single child command is visible
                // The group will be visible
                setParentVisible( true );
                // It will not appear as a group command
                overlay.isGroupCommand = false;
                // Clicking on it will execute the child command
                overlay.callbackApi.execute = visibleChildCommands[ 0 ].callbackApi.execute;
                // It will take the icon of the first selected child
                getActiveChildWatch = scope.$watch( function getSelectedChild() {
                    for( var i = 0, len = visibleChildCommands.length; i < len; i++ ) {
                        var nxt = visibleChildCommands[ i ];
                        if( nxt.isSelected ) {
                            return nxt;
                        }
                    }
                    return null;
                }, bindChildToParent );
            } else {
                // When more than one child is visible
                // The group will be visible
                overlay.visible = true;
                // It will appear as a group command
                overlay.isGroupCommand = true;
                // Clicking on it will open the popup
                overlay.callbackApi.execute = openPopupCallback;
                // It will take the icon of the first selected child
                getActiveChildWatch = scope.$watch( function getSelectedChild() {
                    for( var i = 0, len = visibleChildCommands.length; i < len; i++ ) {
                        var nxt = visibleChildCommands[ i ];
                        if( nxt.isSelected ) {
                            return nxt;
                        }
                    }
                    return null;
                }, bindChildToParent );
            }
        } );
    };

    /**
     * The base logic to bind a command directly to its handlers
     *
     * Bind a list of command handlers to the overlay. This will manage all of the different
     * watches that dynamically update the overlay.
     *
     * @param {Object} commandsViewModel commands view model
     * @param {Object} scope scope
     * @param {Object} watchMap watcher map
     * @param {Object} overlay overlay to update
     * @param {Object[]} handlers command handlers
     * @param {Object} shouldUpdateCallback whether the binding should also change what execute does
     */
    self.bindCommand = _.curry( function( commandsViewModel, scope, watchMap, overlay, handlers, shouldUpdateCallback ) {
        var cmdTrace = new Debug( 'command:commandConfigurationService:' + overlay.commandId );
        var activeExpression = null;
        var activeWatches = {};
        var watchHandlers = {
            visibleWhen: function( newVal ) {
                cmdTrace( 'Visibility change', newVal );
                commandHandlerService.setIsVisible( overlay, Boolean( newVal ) );
            },
            enableWhen: function( newVal ) {
                cmdTrace( 'Enabled change', newVal );
                commandHandlerService.setIsEnabled( overlay, Boolean( newVal ) );
            },
            selectWhen: function( newVal ) {
                cmdTrace( 'Selected change', newVal );
                commandHandlerService.setSelected( overlay, newVal );
                commandHandlerService.swapIconTitle( false, newVal, overlay );
            }
        };

        var updateActiveHandler = function( handler, conditionExpression ) {
            if( !activeExpression || ccu.getExpressionLength( conditionExpression, commandsViewModel ) > ccu.getExpressionLength( activeExpression, commandsViewModel ) ) {
                cmdTrace( 'Active handler change', handler, 'Old condition', activeExpression, 'New condition', conditionExpression );
                if( logger.isDeclarativeLogEnabled() ) {
                    debugService.debugUpdateHandlerOnCommand( handler, conditionExpression, activeExpression, commandsViewModel );
                }
                activeExpression = conditionExpression;
                [ 'visibleWhen', 'selectWhen', 'enableWhen' ].forEach( function( conditionKey ) {
                    // Get rid of any active watch
                    if( activeWatches[ conditionKey ] ) {
                        activeWatches[ conditionKey ]();
                        delete activeWatches[ conditionKey ];
                    }
                    // Setup a new watch (if necessary)
                    if( handler[ conditionKey ] ) {
                        activeWatches[ conditionKey ] = addWatch( handler[ conditionKey ].condition,
                            ccu.getConditionExpression( commandsViewModel, handler[ conditionKey ].condition ), watchHandlers[ conditionKey ] );
                    }
                } );
                // Update execute function
                if( _.isBoolean( shouldUpdateCallback ) ) {
                    if( shouldUpdateCallback ) {
                        overlay.callbackApi.execute = getExecuteCallback( overlay, commandsViewModel, scope, handler );
                    }
                }
                if( shouldUpdateCallback instanceof Function ) {
                    shouldUpdateCallback( handler, true );
                }
            }
        };

        var addWatch = function( name, expression, handler ) {
            var condName = name.split( '.' )[ 1 ];

            var nestedWatches = [];
            var removeWatch = function() {
                for( const watchRemoveFn of nestedWatches ) {
                    watchRemoveFn();
                }
                // Remove the handler
                watchMap[ name ].handlers = watchMap[ name ].handlers.filter( function( h ) {
                    return h !== handler;
                } );
                // If no more handlers remove the watch
                if( watchMap[ name ].handlers.length === 0 ) {
                    watchMap[ name ].watcher();
                    delete watchMap[ name ];
                    // Cannot cleanup scope.conditions - some activeWhen conditions reuse the visibleWhen conditions of other commands
                    // So when that command becomes "inactive" and it removes the condition the activeWhen condition reusing that condition
                    // also becomes "inactive" which turns the condition back on -> infinite loop
                    // delete scope.conditions[ condName ];
                }
            };

            if( !watchMap[ name ] ) {
                var multiHandlerWatch = function( newVal, oldVal ) {
                    scope.conditions[ condName ] = newVal; // Have to put into scope for object based condition reuse
                    watchMap[ name ].lastValue = newVal;
                    // This must be a for loop as each handler may potentially add or remove additional handlers
                    for( var i = 0; i < watchMap[ name ].handlers.length; i++ ) {
                        watchMap[ name ].handlers[ i ]( newVal, oldVal );
                    }
                };
                var watch;
                if( typeof expression === 'string' ) {
                    watch = scope.$watch( expression, multiHandlerWatch );
                } else {
                    //Ensure nested object based conditions are also watched
                    nestedWatches = ccu.getConditions( expression )
                        .map( n => addWatch( `conditions.${n}`, ccu.getConditionExpression( commandsViewModel, `conditions.${n}` ), function() {
                            //Don't actually care about result, just need to ensure scope.conditions[x] is updated
                        } ) );
                    var objectsToWatch = expressionParserUtils.getSubExpressions( expression );
                    watch = scope.$watchGroup( objectsToWatch, function evaluateObjectCondition() {
                        var newVal = conditionService.evaluateCondition( commandsViewModel, expression, scope );
                        var oldVal = scope.conditions[ condName ];
                        scope.conditions[ condName ] = newVal; // Have to put into scope for object based condition reuse
                        watchMap[ name ].lastValue = newVal;
                        // This must be a for loop as each handler may potentially add or remove additional handlers
                        for( var i = 0; i < watchMap[ name ].handlers.length; i++ ) {
                            watchMap[ name ].handlers[ i ]( newVal, oldVal );
                        }
                    }, true );
                }

                watchMap[ name ] = {
                    handlers: [ handler ],
                    watcher: watch
                };
            } else {
                watchMap[ name ].handlers.push( handler );
                handler( watchMap[ name ].lastValue, watchMap[ name ].lastValue );
            }
            return removeWatch;
        };

        return handlers.map( function( handler ) {
            var conditionExpression = ccu.getConditionExpression( commandsViewModel, handler.activeWhen.condition );
            var handleConditionChange = function( newValue, oldValue ) {
                if( newValue ) {
                    updateActiveHandler( handler, conditionExpression );
                } else {
                    // If the expression was currently active we need to find the next longest and make it active
                    if( activeExpression === conditionExpression && newValue !== oldValue ) {
                        activeExpression = null;
                        // This is a "worst case" scenario - requires re evaluating all conditions again
                        // Happens very rarely as active when conditions typically do not change once the command bar is rendered
                        handlers.forEach( function( h ) {
                            var ce = ccu.getConditionExpression( commandsViewModel, h.activeWhen.condition );
                            var isValidHandler = conditionService.evaluateCondition( commandsViewModel, ce, scope );
                            if( isValidHandler ) {
                                updateActiveHandler( h, ce );
                            } else if( !isValidHandler && shouldUpdateCallback instanceof Function ) {
                                // If some handler is not active and if caller
                                //has some call back give control to call back to do some action
                                shouldUpdateCallback( h, isValidHandler );
                            }
                        } );
                    }
                }
            };
            return addWatch( handler.activeWhen.condition, conditionExpression, handleConditionChange );
        } );
    } );

    /**
     * Setup a special watcher for commands which open panels. Optimized version of assigning a
     * "selectWhen" to every command that could open a panel.
     *
     * When the active command context is set any command with the same command id will be marked as
     * selected
     *
     * @param {Object} scope - Scope to setup the $watch on
     * @param {List<ZeroCompileCommandHandler>} commands - Commands to update
     */
    var setupSelectedWatcher = function( scope, commands ) {
        scope.$watch( function getActiveCommandId() {
            return appCtxService.getCtx( 'activeNavigationCommand.commandId' ) || appCtxService.getCtx( 'activeToolsAndInfoCommand.commandId' ) || appCtxService.getCtx( 'sidenavCommandId' );
        }, function( newActiveCommandId ) {
            var updateSelectedFlag = function( overlay ) {
                //toggle commands and group commands determine their own selected state
                if( !overlay.isToggleCommand && !overlay.isGroupCommand ) {
                    overlay.isSelected = overlay.commandId === newActiveCommandId;
                    commandHandlerService.swapIconTitle( false, overlay.isSelected, overlay );
                }
            };
            commands.forEach( updateSelectedFlag );
        } );
    };

    /**
     * Dynamically add a command placement to the commands view model.
     *
     * This must be done before the command bar using the modified anchor is active - it
     * will not force existing command bars to update with the newly added commands
     *
     * @param {CommandPlacement} placements Command placement definitions
     * @returns {Promise<Function>} A promise that will be resolved with a function that will remove the dynamic placements
     */
    self.addPlacements = function( placements ) {
        return getCommandsViewModelPromise()
            .then( function( viewModelJson ) {
                var modifiedAnchors = {};
                var placementIds = placements.map( function( placement ) {
                    var id = '$$' + dynamicPlacementCounter++;
                    viewModelJson.commandPlacements[ id ] = placement;
                    modifiedAnchors[ placement.uiAnchor ] = true;
                    return id;
                } );
                Object.keys( modifiedAnchors ).forEach( function( anchor ) {
                    delete optimizedViewModelCache[ anchor ];
                } );
                return function deleteDynamicPlacements() {
                    placementIds.forEach( function( id ) {
                        delete viewModelJson.commandPlacements[ id ];
                        Object.keys( modifiedAnchors ).forEach( function( anchor ) {
                            delete optimizedViewModelCache[ anchor ];
                        } );
                    } );
                };
            } );
    };

    /**
     * Get the command overlay that is active with the given command id.
     *
     * @param {String} commandId - Id of the command to get
     * @param {Object} context - context the command will be be active in
     * @param {Promise} deferred - resolved with the command overlay (or null if not found)
     * @returns {Promise} - promise resolved when done
     */
    self.getCommand = function( commandId, context ) {
        // If no context provided assume it is just trying to get display information
        if( !context ) {
            return getCommandNoContext( commandId );
        }
        return initialize( context, null, commandId )
            .then( function( commandsViewModel ) {
                // And check for the command in all of the placements
                // Timeout is necessary as activeWhen conditions are not evaluated until the next digest cycle
                // So the command is not actually "ready" when it is returned
                // Other solution is to evaluating active when conditions immediately, but that affects performance
                // Only doing this in getCommand is the "best" as is does not happen very often and avoids performance hit
                let awTimeout = AwTimeoutSvc.instance;
                return awTimeout().then( function() {
                    logger.trace( 'Watcher count for ' + commandId, context.$$watchersCount );
                    // Command may have ended up as a child command, but placement does not matter
                    return commandsViewModel.activeCommandsList[ 0 ];
                } );
            } );
    };

    /**
     * Get the commands overlays from this provider.
     *
     * @param {String} commandAreaNameToken - Command area name token (tools and info, one step)
     * @param {Object} context - Additional context to use in command evaluation
     * @returns {Promise} Promise resolved with the command list
     */
    self.getCommands = function( commandAreaNameToken, context ) {
        trace( 'Loading commands', commandAreaNameToken );

        var getActiveCommandsList = function( commandsViewModel ) {
            // And return the commands placed in commandAreaNameToken
            logger.trace( 'Watcher count for ' + commandAreaNameToken, context.$$watchersCount );
            return commandsViewModel.activeCommandsList;
        };

        var getInitializePromise = function() {
            return initialize( context, commandAreaNameToken );
        };

        if( anchorDefinitionMap[ commandAreaNameToken ] ) {
            var anchorConfig = anchorDefinitionMap[ commandAreaNameToken ];
            // This timeout is to give the rest of the page time to render
            // Condition evaluation for a large number of commands is very expensive and locks up slower browsers (IE11)
            // As commands are a lower priority than the rest of the page they can be delayed to give the rest of the
            // page time to become usable
            if( anchorConfig.delay ) {
                // Only affects initial page load
                trace( 'Delaying command evaluation', commandAreaNameToken, anchorConfig );
                delete anchorDefinitionMap[ commandAreaNameToken ];
                let awTimeout = AwTimeoutSvc.instance;
                return awTimeout( anchorConfig.delay ).then( getInitializePromise ).then( getActiveCommandsList );
            }
        }
        return getInitializePromise().then( getActiveCommandsList );
    };

    /**
     * Initialize a command provider for the given scope/commandAreaNameToken
     *
     * @param {Object} scope - Scope to attach view model to
     * @param {Object} commandAreaNameToken - Command anchor(s)
     * @param {Object} commandId - ID(s) of the command to optmize for
     * @returns {Promise} Promise that will be resolved when view model is attached
     */
    var initialize = function( scope, commandAreaNameToken, commandId ) {
        var cacheId = commandAreaNameToken || commandId;
        // Load the allCommandsViewModel
        return getCommandsViewModelPromise()
            .then( function( viewModelJson ) {
                var commandAreaNameTokens = commandAreaNameToken ? commandAreaNameToken.split( ',' ) : [];
                var commandIds = commandId ? commandId.split( ',' ) : [];

                var getFromCache = function() {
                    if( !optimizedViewModelCache[ cacheId ] ) {
                        optimizedViewModelCache[ cacheId ] = ccu.getOptimizedViewModel( viewModelJson,
                            commandAreaNameTokens, commandIds );
                    }
                    return optimizedViewModelCache[ cacheId ];
                };

                var optVM = getFromCache();
                if( commandAreaNameToken && logger.isDeclarativeLogEnabled() ) {
                    debugService.debugGetCommandsForAnchor( commandAreaNameToken, optVM );
                }
                optVM._viewModelId = 'commandsViewModel_' + cacheId;
                optVM.skipClone = true;
                // Optimize the view model - remove anything not needed by the commands placed in commandAreaNameToken
                return optVM;
            } )
            .then( function( optimizedViewModel ) {
                // Process the view model json and load server visibility
                // These are done in parallel but the building of commands is not done until later to prevent extra condition evaluation
                // No reason to start evaluating when not all of the information is available
                let awPromise = AwPromiseSvc.instance;
                return awPromise.all( [
                    viewModelService.populateViewModelPropertiesFromJson( optimizedViewModel, null, null, true, 'commandsViewModel' ),
                    commandVisibilityService.loadServerVisibility( optimizedViewModel )
                ] ).then( function( r ) {
                    scope.$on( '$destroy', function() {
                        commandVisibilityService.unloadServerVisibility( optimizedViewModel );
                    } );
                    return r[ 0 ];
                } );
            } )
            .then( function( commandsViewModel ) {
                // Complete processing of the view model
                commandsViewModel.activeCommandsList = getCommandsForViewModel( commandsViewModel, scope );
                // And tie to the view model
                viewModelService.setupLifeCycle( scope, commandsViewModel, true );

                if( commandAreaNameToken && logger.isDeclarativeLogEnabled() ) {
                    debugService.debugGetActiveCommandsForAnchor( commandAreaNameToken, commandsViewModel.activeCommandsList, scope );
                }
                return commandsViewModel;
            } );
    };

    /**
     * Get the execute function for the currently active handler
     *
     * @param {Object} overlay Command overlay
     * @param {Object} commandsViewModel Commands view model
     * @param {Object} scope Scope
     * @param {Object} activeHandler Currently active handler
     * @param {Object} commandDimension dimension info
     * @returns {Object} instructions on how to execute
     */
    var getExecuteCallback = function( overlay, commandsViewModel, scope, activeHandler ) {
        return function execute( commandDimension ) {
            debugService.debug( 'commands', overlay.commandId );
            // Adding commandDimension [offSetHeight, width , leftpositon ] to activeCommandDimension
            commandsViewModel.activeCommandDimension = commandDimension;

            // Toggle command execution
            // If a toggle command update icon and title
            if( overlay.isToggleCommand ) {
                var commandExecuted = true;
                var selectionValueOnEvent = false;
                commandHandlerService.swapIconTitle( commandExecuted, selectionValueOnEvent, overlay );
            }

            //If the action associated is a callback function, call the function
            if( _.isFunction( activeHandler.action ) ) {
                return activeHandler.action();
            }

            // Actually execute command
            // In most cases this will defer to the view model service
            // There is special handling for popup actions
            var action = commandsViewModel._internal.actions[ activeHandler.action ];
            if( action.actionType === 'popup' ) {
                return {
                    view: action.inputData.view,
                    showPopup: true
                };
            }

            let awPromise = AwPromiseSvc.instance;

            var deferred = awPromise.defer();

            return awPromise.resolve( viewModelService.executeCommand( commandsViewModel, activeHandler.action, scope ) )
                .then( function( x ) {
                    var actionWatch = scope.$watch( function() {
                        return commandsViewModel.getToken().isActive();
                    }, function( val ) {
                        if( !val ) {
                            actionWatch();
                            deferred.resolve( x );
                        }
                    } );
                    return deferred.promise;
                } )
                .catch( function( x ) {
                    var actionWatch = scope.$watch( function() {
                        return commandsViewModel.getToken().isActive();
                    }, function( val ) {
                        if( !val ) {
                            actionWatch();
                            deferred.reject( x );
                        }
                    } );
                    return deferred.promise;
                } );
        };
    };

    /**
     * Process the commands view model and return the actual command overlays
     *
     * @param {ViewModel} commandsViewModel The commands view model
     * @param {Scope} scope The scope to attach the view model to
     * @returns {List<ZeroCompileCommandHandler>} "Live" command handlers
     */
    var getCommandsForViewModel = function( commandsViewModel, scope ) {
        // Condition service will not eval conditions if already set
        scope.conditions = {};
        // Normally happens in setup lifecycle method, but it has to happen before binding command handlers
        scope.data = commandsViewModel;
        scope.ctx = appCtxService.ctx;

        // Partially apply to make all commands share watch map and also avoid passing a ton of parameters
        var bindOverlayToHandlers = self.bindCommand( commandsViewModel, scope, {} );

        /**
         * Build a command overlay from a command definition
         *
         * @param {Object} command Command definition
         * @param {String} cmdId Command id
         * @returns {ZeroCompileCommandHandler} Command overlay
         */
        var getCommandOverlay = function( command, cmdId ) {
            // The handlers for the given command
            _.forEach( commandsViewModel.commandHandlers, function( value, key ) {
                value.handlerName = key;
            } );

            var handlers = _.filter( commandsViewModel.commandHandlers, {
                id: cmdId
            } );

            // Get the placement info (if available)
            var placement = _.filter( commandsViewModel.commandPlacements, function( placement ) {
                return placement.id === cmdId;
            } )[ 0 ];

            var overlay = new ZeroCompileCommandHandler( cmdId, command, placement );
            bindCommandTitle( commandsViewModel, scope, overlay );
            if( command.isRibbon ) {
                // Ribbon commands will always open popup
                overlay.isGroupCommand = true;
                overlay.callbackApi.execute = openPopupCallback;
                _.forEach( handlers, function( handler ) {
                    if( !handler.action ) {
                        handler.action = openPopupCallback;
                    }
                } );
                bindOverlayToHandlers( overlay, handlers, true );
            } else if( command.isGroup || command.isShuttle ) {
                // Group command visibility is an OR of child commands
                var childCommandIdMap = _.filter( commandsViewModel.commandPlacements, function( p ) {
                        return p.parentGroupId === overlay.commandId;
                    } )
                    .map( functional.getProp( 'id' ) )
                    .reduce( functional.toBooleanMap, {} );
                var childCommands = _.map( _.pickBy( commandsViewModel.commands, function( command, cmdId ) {
                    return childCommandIdMap[ cmdId ];
                } ), getCommandOverlay );
                setupSelectedWatcher( scope, childCommands );
                if( command.isShuttle ) {
                    bindShuttleCommand( scope, overlay, childCommands );
                } else {
                    bindGroupCommand( scope, overlay, childCommands );
                }
            } else {
                bindOverlayToHandlers( overlay, handlers, true );
            }
            return overlay;
        };

        // Only build overlay for parent commands from here
        var parentCommandIdMap = _.filter( commandsViewModel.commandPlacements, function( p ) {
                return !p.parentGroupId;
            } )
            .map( functional.getProp( 'id' ) )
            .reduce( functional.toBooleanMap, {} );
        var commands = _.map( _.pickBy( commandsViewModel.commands, function( command, cmdId ) {
            return parentCommandIdMap[ cmdId ];
        } ), getCommandOverlay );
        // Setup optimized "selectWhen" that will make command selected when panel open
        setupSelectedWatcher( scope, commands );
        return commands;
    };
}

export default class CommandConfigurationService extends AwBaseService {
    constructor() {
        super();
        return new CommandConfiguration();
    }
}

app.factory( 'commandConfigurationService', () => CommandConfigurationService.instance );

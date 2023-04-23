// Copyright (c) 2020 Siemens

/**
 * The ui element provides a toolbar which will have a two slots (anchor) to plug commands.
 * @module js/aw-toolbar.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-command-bar.directive';
import 'js/aw-icon.directive';
import commandOverflowSvc from 'js/commandOverflow.service';
import resizeObserverSvc from 'js/resizeObserver.service';
import 'js/command.service';
import 'js/appCtxService';
import 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import 'js/aw-class.directive';
import 'js/aw-click.directive';
import 'js/aw-flex-row.directive';
import 'js/extended-tooltip.directive';
import _ from 'lodash';
import AwTimeoutSvc from 'js/awTimeoutService';

/**
 * @example <aw-toolbar first-anchor="topSlot" second-anchor="bottomSlot" orientation="VERTICAL">
 * @attribute firstAnchor : first slot to hook commands.
 * @attribute secondAnchor : second slot to hook commands.
 * @attribute orientation: hint to layout the toolbar, it takes one of the values ['VERTICAL','HORIZONTAL']. By default it layouts the toolbar horizontally.
 * @attribute reverse: Whether to reverse the order of the commands. Reverse if directive has "reverse" attribute and it is not
 * explicitly false.
 * @attribute showCommandLabels: If true show labels under the commands.
 * @attribute context: context.
 * @member aw-toolbar
 * @memberof NgElementDirectives
 */
app.directive( 'awToolbar', [
    'commandService',
    'appCtxService',
    'localeService',
    function( commandService, appCtxService, localeService ) {
        return {
            restrict: 'E',
            scope: {
                firstAnchor: '@',
                secondAnchor: '@',
                orientation: '@?',
                reverse: '@?',
                reverseSecond: '@?',
                showCommandLabels: '=?',
                context: '=?',
                overflow: '=?'
            },
            replace: true,
            templateUrl: app.getBaseUrlPath() + '/html/aw-toolbar.directive.html',
            link: function( scope, element, attrs ) {
                scope.isReverse = attrs.hasOwnProperty( 'reverse' ) && scope.reverse !== 'false';
                scope.isReverseSecond = attrs.hasOwnProperty( 'reverseSecond' ) ? attrs.hasOwnProperty( 'reverseSecond' ) && scope.reverseSecond !== 'false' : scope.isReverse;
                scope.orientation = scope.orientation === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';

                if( scope.overflow === null || scope.overflow === undefined ) {
                    scope.overflow = true;
                }

                var commandList = [];
                const commandBarSelector = '.aw-commandBars';

                /**
                 * Create new command scope to be supplied to getCommands method
                 *
                 * @method createCommandScope
                 * @memberOf NgDirectives.awToolbarDirective
                 * @returns {Object} commandScope - a new isolated scope to evaluate commands in
                 *
                 */
                var createCommandScope = function() {
                    // Create a new isolated scope to evaluate commands in
                    var commandScope = null;
                    commandScope = scope.$new( true );
                    commandScope.ctx = appCtxService.ctx;
                    commandScope.commandContext = scope.context;

                    return commandScope;
                };

                /**
                 * Update the static commands
                 *
                 * @method updateStaticCommands
                 * @memberOf NgDirectives.awToolbarDirective
                 *
                 * @param {Object[]} newStaticCommands - New commands
                 */
                var updateStaticCommands = function( newStaticCommands ) {
                    newStaticCommands.forEach( function( cmd ) {
                        cmd.alignment = scope.orientation;
                        commandList.push( cmd );
                    } );
                };

                const getCommandIdsFromDOM = () => {
                    var commandIds = [];
                    //getCommandIds from DOM
                    var commandBars = element.find( commandBarSelector ).children();
                    commandBars.each( function( index, item ) {
                        var overflowCommandsList = [];

                        //calculateOverflow
                        var overflowBreakPointCalculator = commandOverflowSvc.overflowBreakPointCalculator();
                        var breakIndex = overflowBreakPointCalculator( item, scope.orientation );

                        var commands = [ ...item.querySelector( '.aw-commands-wrapper:not(.aw-commands-overflow)' ).children ];

                        // has command overflow
                        if( breakIndex !== commands.length ) {
                            overflowCommandsList = commands.slice( breakIndex );
                        }

                        if( overflowCommandsList.length ) {
                            overflowCommandsList.forEach( function( item ) {
                                commandIds.push( item.querySelector( 'button' ).getAttribute( 'button-id' ) );
                            } );
                        }
                    } );

                    return commandIds;
                };

                const setOverflowOverlays = () => {
                    scope.overflownCommands = [];
                    const commandIds = getCommandIdsFromDOM();
                    scope.overflownCommands = commandIds.map( id => commandList.find( x => x.commandId === id ) );
                };

                const loadCommands = () => {
                    var commandScopeFirstAnchor = createCommandScope();
                    var commandScopeSecondAnchor = createCommandScope();

                    let firstAnchorPromise = commandService.getCommands( scope.firstAnchor, commandScopeFirstAnchor );
                    let secondAnchorPromise = commandService.getCommands( scope.secondAnchor, commandScopeSecondAnchor );

                    return AwPromiseService.instance.all( [ firstAnchorPromise, secondAnchorPromise ] ).then( function( results ) {
                        updateStaticCommands( results[ 0 ] );
                        updateStaticCommands( results[ 1 ] );

                        setOverflowOverlays();
                    } );
                };

                const resizeObserverCallback = ( ) => {
                    scope.hideMore = true;

                    var commandBars = element.find( commandBarSelector ).children();
                    commandBars.each( function( index, item ) {
                        var hasOverflow = commandOverflowSvc.hasOverflow( item, scope.orientation );
                        if( scope.hideMore !== false ) {
                            scope.hideMore = !hasOverflow;
                        }

                        commandOverflowSvc.updateTabIndexOnOverflow( item, scope.orientation );
                    } );

                    //This is required for the use case
                    //when commands are added/removed from toolbar using visible when condition
                    scope.$evalAsync( );
                };

                if( scope.overflow ) {
                    if( resizeObserverSvc.supportsResizeObserver() ) {
                        let commandBarObservers = [];
                        scope.hideMore = true;

                        const initializeObserver = () => {
                            // define a callback
                            const callback = _.debounce( resizeObserverCallback, 200, {
                                maxWait: 10000,
                                trailing: true,
                                leading: false
                            } );

                            AwTimeoutSvc.instance( function() {
                                let commandBars = element.find( commandBarSelector ).children();
                                commandBars.each( function( index, item ) {
                                    commandBarObservers[ index ] = resizeObserverSvc.observe( item, callback );
                                } );
                            } );
                        };

                        const destroyObserver = () => {
                            commandBarObservers.forEach( ( item ) => item() );
                        };

                        initializeObserver();

                        var updateTabIndex = eventBus.subscribe( 'awPopupCommandCell.commandExecuted', function() {
                            scope.$applyAsync( function() {
                                var commandBars = element.find( commandBarSelector ).children();
                                commandBars.each( function( index, item ) {
                                    commandOverflowSvc.updateTabIndexOnOverflow( item, scope.orientation );
                                } );
                            } );
                        } );

                        scope.$on( '$destroy', function() {
                            destroyObserver();
                            eventBus.unsubscribe( updateTabIndex );
                        } );
                    }

                    //Need to reverse the order of the second command bar for the flex reverse wrap to work
                    scope.isReverseSecond = !scope.isReverseSecond;
                    var toggleOverflowPopupHandler = commandOverflowSvc.overflowPopupHandler();

                    /**
                     * Load the localized text
                     */
                    localeService.getTextPromise().then( function( localTextBundle ) {
                        scope.noCommandsError = localTextBundle.NO_COMMANDS_TEXT;
                        scope.moreCommandExtendedTooltip = localTextBundle.MORE_BUTTON_TITLE;
                    } );

                    const toggleOverflowPopup = ( event ) => {
                        var placement = scope.orientation === 'VERTICAL' ? 'left-end' : 'bottom-start';
                        toggleOverflowPopupHandler.toggleOverflowPopup( event.currentTarget, placement, scope );
                    };

                    scope.handleOverflowClick = ( event ) => {
                        if( !commandList.length ) {
                            loadCommands();
                        } else {
                            setOverflowOverlays();
                        }

                        toggleOverflowPopup( event );
                    };
                }
            }
        };
    }
] );
